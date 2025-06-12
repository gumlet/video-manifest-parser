import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface AdaptationSet {
  '@id': string;
  '@contentType': 'video' | 'audio' | 'text';
  '@lang'?: string;
  Representation: {
    '@id': string;
    '@bandwidth': string;
    '@codecs': string;
    '@mimeType': string;
    '@audioSamplingRate'?: string;
    '@width'?: string;
    '@height'?: string;
  };
}

interface MPD {
  Period: {
    AdaptationSet: AdaptationSet[];
  };
}

export class MPDEditor {
  private parser: XMLParser;
  private builder: XMLBuilder;
  private mpd: MPD;

  // Helper methods to get next sequential IDs
  private getNextAdaptationSetId(): string {
    const adaptationSets = this.mpd.Period.AdaptationSet;
    const ids = adaptationSets.map(set => parseInt(set['@id'])).filter(id => !isNaN(id));
    return (ids.length > 0 ? Math.max(...ids) + 1 : 0).toString();
  }

  private getNextRepresentationId(): string {
    const adaptationSets = this.mpd.Period.AdaptationSet;
    const representations = adaptationSets.flatMap(set =>
      Array.isArray(set.Representation) ? set.Representation : [set.Representation]
    );
    const ids = representations
      .map(rep => rep && typeof rep['@id'] === 'string' ? parseInt(rep['@id']) : NaN)
      .filter(id => !isNaN(id));
    return (ids.length > 0 ? Math.max(...ids) + 1 : 0).toString();
  }

  constructor(mpdString: string) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      allowBooleanAttributes: true,
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      format: true,
    });

    const parsed = this.parser.parse(mpdString) as MPD;
    this.mpd = {
      Period: {
        AdaptationSet: parsed.Period?.AdaptationSet || []
      }
    };
  }

  // Add audio stream
  addAudioStream(lang: string, bandwidth: string, codecs: string, audioSamplingRate: string, mimeType: string): void {
    const audioSet: AdaptationSet = {
      '@id': this.getNextAdaptationSetId(),
      '@contentType': 'audio',
      '@lang': lang,
      Representation: {
        '@id': this.getNextRepresentationId(), // Representation ID starts from 0
        '@bandwidth': bandwidth,
        '@codecs': codecs,
        '@mimeType': mimeType,
        '@audioSamplingRate': audioSamplingRate
      }
    };
    this.mpd.Period.AdaptationSet.push(audioSet);
  }

  // Remove audio stream by language
  removeAudioStream(lang: string): void {
    this.mpd.Period.AdaptationSet = this.mpd.Period.AdaptationSet.filter(
      (set) => set['@contentType'] !== 'audio' || set['@lang'] !== lang
    );
    this.resetIds();
  }

  // Add subtitle stream
  addSubtitleStream(lang: string, vttFileSize: number, videoDuration: number): void {
    const subtitleSet: AdaptationSet = {
      '@id': this.getNextAdaptationSetId(),
      '@contentType': 'text',
      '@lang': lang,
      Representation: {
        '@id': this.getNextRepresentationId(),
        '@bandwidth': Math.round((8 * vttFileSize) / videoDuration).toString(),
        '@codecs': 'stpp',
        '@mimeType': 'text/vtt'
      }
    };
    this.mpd.Period.AdaptationSet.push(subtitleSet);
  }

  // Remove subtitle stream by language
  removeSubtitleStream(lang: string): void {
    this.mpd.Period.AdaptationSet = this.mpd.Period.AdaptationSet.filter(
      (set) => set['@contentType'] !== 'text' || set['@lang'] !== lang
    );
    this.resetIds();
  }

  // Get XML string
  toXML(): string {
    return this.builder.build(this.mpd);
  }

  // Reset AdaptationSet IDs and Representation IDs
  private resetIds(): void {
    this.mpd.Period.AdaptationSet.forEach((set, index) => {
      set['@id'] = index.toString();
    });
    this.mpd.Period.AdaptationSet.forEach((set) => {
      const representations = Array.isArray(set.Representation) ? set.Representation : [set.Representation];
      representations.forEach((rep, repIndex) => {
        rep['@id'] = repIndex.toString();
      });
    });
  }

  // Round-trip validation
  static validateRoundTrip(mpdString: string): boolean {
    const editor = new MPDEditor(mpdString);
    const rebuilt = editor.toXML();
    const rebuiltEditor = new MPDEditor(rebuilt);
    return rebuiltEditor.toXML() === rebuilt;
  }
}
