import { Parser } from 'm3u8-parser';

/**
 * Media types supported in M3U8 playlists
 */
type MediaType = 'AUDIO' | 'SUBTITLES' | 'CLOSED_CAPTIONS';

/**
 * Represents a media group in M3U8 playlist
 */
interface Media {
  type: MediaType;
  group_id: string;
  language: string;
  name: string;
  uri: string;
  default?: boolean;
  autoselect?: boolean;
  channels?: number;
}

/**
 * Represents media groups in M3U8 playlist
 */
interface MediaGroups {
  audio: Media[];
  subtitles: Media[];
  closedCaptions: Media[];
  iFrameStreams: IFrameStream[];
}

/**
 * Represents I-Frame stream information in M3U8 playlist
 */
interface IFrameStream {
  bandwidth: number;
  averageBandwidth: number;
  codecs: string;
  resolution: { width: number; height: number };
  videoRange?: string;
  uri: string;
  internalId?: string; // Internal ID for tracking
}

/**
 * Represents a list of uris in M3U8 playlist
 */
interface UriList {
  audio: string[];
  subtitles: string[];
  closedCaptions: string[];
  video: string[];
  iframe: string[];
}

/**
 * M3U8 playlist editor class
 */
export class M3U8Editor {
  private parser: Parser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private manifest: any;
  private manifestString: string;
  private mediaGroups: MediaGroups;

  /**
   * Get language name from ISO code
   * @param isoCode Language ISO code
   * @returns Language name in English
   */
  private getLanguageName(isoCode: string): string {
    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return languageNames.of(isoCode) || '';
  }

  /**
   * Parse channels from media tag
   * @param uri Media URI to search for
   * @returns Number of channels
   */
  private parseChannelsFromMediaTag(uri: string): number {
    const lines = this.manifestString.split('\n');
    const channelsMatch = lines.find((line) => line.includes(uri))?.match(/CHANNELS="(\d+)"/);
    return channelsMatch ? parseInt(channelsMatch[1]) : 2;
  }

  /**
   * Parse I-Frame streams from manifest
   * @returns Array of I-Frame stream information
   */
  private parseIFrameStreams(): IFrameStream[] {
    const lines = this.manifestString.split('\n');
    const iFrameStreams: IFrameStream[] = [];

    // Find all I-Frame stream lines
    const iFrameLines = lines.filter(line => line.startsWith('#EXT-X-I-FRAME-STREAM-INF:'));

    iFrameLines.forEach(line => {
      // Extract parameters
      const params = line
        .replace('#EXT-X-I-FRAME-STREAM-INF:', '')
        .split(',')
        .map(param => param.split('='))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

      // Parse resolution
      const [width, height] = params.RESOLUTION.split('x').map(Number);

      iFrameStreams.push({
        bandwidth: parseInt(params.BANDWIDTH),
        averageBandwidth: parseInt(params['AVERAGE-BANDWIDTH']),
        codecs: params.CODECS.replace(/"/g, ''), // Remove quotes from CODECS
        resolution: { width, height },
        videoRange: params['VIDEO-RANGE'],
        uri: params.URI.replace(/"/g, ''), // Remove quotes from URI
        internalId: `${params.CODECS.replace(/"/g, '')}_${width}x${height}` // Optional internal ID
      });
    });

    return iFrameStreams;
  }

  /**
   * Constructor for M3U8Editor
   * @param m3u8String M3U8 playlist string
   */
  constructor(m3u8String: string) {
    if (!m3u8String || typeof m3u8String !== 'string') {
      throw new Error('Invalid M3U8 string provided');
    }

    this.parser = new Parser();
    this.parser.push(m3u8String);
    this.manifestString = m3u8String;
    this.manifest = this.parser.manifest;

    if (!this.manifest || !this.manifest.mediaGroups || !this.manifest.playlists) {
      throw new Error('Invalid M3U8 manifest structure');
    }

    this.mediaGroups = {
      audio: [],
      subtitles: [],
      closedCaptions: [],
      iFrameStreams: []
    };

    // Initialize media groups
    this.initializeMediaGroups();
  }

  /**
   * Initialize all media groups from manifest
   */
  private initializeMediaGroups(): void {
    // Initialize audio groups
    this.initializeMediaGroup('AUDIO', this.mediaGroups.audio);
    // Initialize subtitle groups
    this.initializeMediaGroup('SUBTITLES', this.mediaGroups.subtitles);
    // Initialize closed captions
    this.initializeMediaGroup('CLOSED-CAPTIONS', this.mediaGroups.closedCaptions);
    // Parse I-Frame streams
    this.mediaGroups.iFrameStreams = this.parseIFrameStreams();
  }

  /**
   * Get all media URIs from the manifest
   * @returns Object containing arrays of URIs for audio, subtitles, closed captions, video, and iframe
   */
  getMediaUris(): UriList {
    const uris: UriList = {
      audio: this.mediaGroups.audio.map(media => media.uri),
      subtitles: this.mediaGroups.subtitles.map(media => media.uri),
      closedCaptions: this.mediaGroups.closedCaptions.map(media => media.uri),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      video: this.manifest.playlists.map((playlist: any) => playlist.uri),
      iframe: this.mediaGroups.iFrameStreams.map(stream => stream.uri)
    };
    return uris;
  }

  /**
   * Initialize a specific media group
   * @param groupType Type of media group (AUDIO, SUBTITLES, CLOSED-CAPTIONS)
   * @param targetArray Array to populate with media items
   */
  private initializeMediaGroup(groupType: string, targetArray: Media[]): void {
    const mediaType = groupType === 'AUDIO' ? 'AUDIO' :
                     groupType === 'SUBTITLES' ? 'SUBTITLES' : 'CLOSED_CAPTIONS';

    for (const key of Object.keys(this.manifest.mediaGroups[groupType])) {
      for (const value of Object.values(this.manifest.mediaGroups[groupType][key]) as Media[]) {
        targetArray.push({
          type: mediaType,
          name: this.getLanguageName(value.language),
          group_id: key,
          language: value.language,
          uri: value.uri,
          default: value.language === 'en' ? true : value.default,
          autoselect: value.autoselect,
          channels: groupType === 'AUDIO' ? this.parseChannelsFromMediaTag(value.uri) : undefined
        });
      }
    }
  }

  /**
   * Add audio rendition to playlist
   * @param groupId Group ID for the audio
   * @param language Language code (e.g., 'en')
   * @param name Display name for the audio
   * @param uri URI for the audio stream
   * @param channels Number of audio channels (default: 2)
   */
  addAudioRendition(
    groupId: string,
    language: string,
    name: string,
    uri: string,
    channels: number = 2
  ): void {
    const audio: Media = {
      type: 'AUDIO',
      group_id: groupId,
      language,
      name,
      uri,
      default: false,
      autoselect: true,
      channels
    };
    this.mediaGroups.audio.push(audio);
  }

  /**
   * Remove audio rendition by language
   * @param language Language code to remove
   */
  removeAudioRendition(language: string): void {
    this.mediaGroups.audio = this.mediaGroups.audio.filter(
      (m) => m.type !== 'AUDIO' || m.language !== language
    );
  }

  /**
   * Add subtitle rendition to playlist
   * @param groupId Group ID for the subtitles
   * @param language Language code (e.g., 'en')
   * @param name Display name for the subtitles
   * @param uri URI for the subtitle stream
   */
  addSubtitleRendition(
    groupId: string,
    language: string,
    name: string,
    uri: string
  ): void {
    const subtitle: Media = {
      type: 'SUBTITLES',
      group_id: groupId,
      language,
      name,
      uri,
      default: false,
      autoselect: true
    };
    this.mediaGroups.subtitles.push(subtitle);
  }

  /**
   * Remove subtitle rendition by language
   * @param language Language code to remove
   */
  removeSubtitleRendition(language: string): void {
    this.mediaGroups.subtitles = this.mediaGroups.subtitles.filter(
      (m) => m.type !== 'SUBTITLES' || m.language !== language
    );
  }

  /**
   * Remove video rendition by uri
   * @param uri URI of the video rendition to remove
   */
  removeVideoRendition(uri: string): void {
    const removeIndex = this.manifest.playlists.findIndex((playlist: { uri: string }) => playlist.uri === uri);
    if (removeIndex !== -1) {
      this.mediaGroups.iFrameStreams = this.mediaGroups.iFrameStreams.filter(
        (stream) => stream.internalId !== `${this.manifest.playlists[removeIndex].attributes.CODECS.split(',')[0]}_${this.manifest.playlists[removeIndex].attributes.RESOLUTION.width}x${this.manifest.playlists[removeIndex].attributes.RESOLUTION.height}`
      );
      this.manifest.playlists.splice(removeIndex, 1);
    }
  }

  /**
   * Remove any track by uri
   * @param uri URI of the video rendition to remove
   */
  removeTrackByUri(uri: string): void {
    const uriList = this.getMediaUris();
    if (uriList.audio.includes(uri)) {
      this.mediaGroups.audio = this.mediaGroups.audio.filter(media => media.uri !== uri);
    } else if (uriList.subtitles.includes(uri)) {
      this.mediaGroups.subtitles = this.mediaGroups.subtitles.filter(media => media.uri !== uri);
    } else if (uriList.closedCaptions.includes(uri)) {
      this.mediaGroups.closedCaptions = this.mediaGroups.closedCaptions.filter(media => media.uri !== uri);
    } else if (uriList.video.includes(uri)) {
      this.removeVideoRendition(uri);
    } else if (uriList.iframe.includes(uri)) {
      this.mediaGroups.iFrameStreams = this.mediaGroups.iFrameStreams.filter(stream => stream.uri !== uri);
    }
  }

  /**
   * Convert the playlist back to M3U8 string format
   * @returns M3U8 playlist string
   */
  toM3U8(): string {
    const lines: string[] = ['#EXTM3U', '\n', '#EXT-X-INDEPENDENT-SEGMENTS', '\n'];

    // Add media groups audio
    this.mediaGroups.audio.forEach((media) => {
      const params = [
        `TYPE=${media.type}`,
        `URI="${media.uri}"`,
        `GROUP-ID="${media.group_id}"`,
        `LANGUAGE="${media.language}"`,
        `NAME="${media.name}"`
      ];
      params.push('DEFAULT=NO');
      if (media.autoselect) params.push('AUTOSELECT=YES'); else params.push('AUTOSELECT=NO');
      params.push(`CHARACTERISTICS="${media.default ? 'DEFAULT=YES' : 'DEFAULT=NO'}:${media.autoselect ? 'AUTOSELECT=YES' : 'AUTOSELECT=NO'}"`);
      if (media.channels) params.push(`CHANNELS="${media.channels}"`);
      lines.push(`#EXT-X-MEDIA:${params.join(',')}`);
    });

    lines.push('\n');

    // Add media groups subtitles
    this.mediaGroups.subtitles.forEach((media) => {
      const params = [
        `TYPE=${media.type}`,
        `URI="${media.uri}"`,
        `GROUP-ID="${media.group_id}"`,
        `LANGUAGE="${media.language}"`,
        `NAME="${media.name}"`
      ];
      params.push('DEFAULT=NO');
      if (media.autoselect) params.push('AUTOSELECT=YES'); else params.push('AUTOSELECT=NO');
      params.push(`CHARACTERISTICS="${media.default ? 'DEFAULT=YES' : 'DEFAULT=NO'}:${media.autoselect ? 'AUTOSELECT=YES' : 'AUTOSELECT=NO'}"`);
      lines.push(`#EXT-X-MEDIA:${params.join(',')}`);
    });

    lines.push('\n');

    // Add media groups closed captions
    this.mediaGroups.closedCaptions.forEach((media) => {
      const params = [
        `TYPE=${media.type}`,
        `URI="${media.uri}"`,
        `GROUP-ID="${media.group_id}"`,
        `LANGUAGE="${media.language}"`,
        `NAME="${media.name}"`
      ];
      params.push('DEFAULT=NO');
      if (media.autoselect) params.push('AUTOSELECT=YES'); else params.push('AUTOSELECT=NO');
      params.push(`CHARACTERISTICS="${media.default ? 'DEFAULT=YES' : 'DEFAULT=NO'}:${media.autoselect ? 'AUTOSELECT=YES' : 'AUTOSELECT=NO'}"`);
      lines.push(`#EXT-X-MEDIA:${params.join(',')}`);
    });

    lines.push('\n');

    // Add stream inf
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.manifest.playlists.forEach((playlist: any) => {
      const params = [
        `BANDWIDTH=${playlist.attributes.BANDWIDTH}`,
        `AVERAGE-BANDWIDTH=${playlist.attributes['AVERAGE-BANDWIDTH']}`,
        `CODECS="${playlist.attributes.CODECS}"`
      ];
      if (playlist.attributes.RESOLUTION) {
        params.push(`RESOLUTION=${playlist.attributes.RESOLUTION.width}x${playlist.attributes.RESOLUTION.height}`);
      }
      if (playlist.attributes['FRAME-RATE']) {
        params.push(`FRAME-RATE=${playlist.attributes['FRAME-RATE']}`);
      }
      if (playlist.attributes['VIDEO-RANGE']) {
        params.push(`VIDEO-RANGE=${playlist.attributes['VIDEO-RANGE']}`);
      }
      if (playlist.attributes.AUDIO && this.mediaGroups.audio.length > 0) {
        params.push(`AUDIO="${playlist.attributes.AUDIO}"`);
      }
      if (playlist.attributes.SUBTITLES && this.mediaGroups.subtitles.length > 0) {
        params.push(`SUBTITLES="${playlist.attributes.SUBTITLES}"`);
      }
      if (playlist.attributes['CLOSED-CAPTIONS']) {
        params.push(`CLOSED-CAPTIONS=${playlist.attributes['CLOSED-CAPTIONS']}`);
      }
      lines.push(`#EXT-X-STREAM-INF:${params.join(',')}`);
      lines.push(playlist.uri);
    });

    lines.push('\n');

    // Add I-Frame streams
    this.mediaGroups.iFrameStreams.forEach((stream) => {
      const params = [
        `BANDWIDTH=${stream.bandwidth}`,
        `AVERAGE-BANDWIDTH=${stream.averageBandwidth}`,
        `CODECS="${stream.codecs}"`
      ];
      if (stream.resolution) {
        params.push(`RESOLUTION=${stream.resolution.width}x${stream.resolution.height}`);
      }
      if (stream.videoRange) {
        params.push(`VIDEO-RANGE=${stream.videoRange}`);
      }
      if (this.mediaGroups.closedCaptions.length === 0) {
        params.push(`CLOSED-CAPTIONS=NONE`);
      }
      params.push(`URI="${stream.uri}"`);
      lines.push(`#EXT-X-I-FRAME-STREAM-INF:${params.join(',')}`);
    });

    return `${lines.join('\n').replace(/\n{2,}/g, '\n\n')}\n`;
  }

  /**
   * Validate round-trip conversion
   * @returns true if round-trip is valid, false otherwise
   */
  validateRoundTrip(): boolean {
    const original = this.manifestString;
    const editor = new M3U8Editor(this.toM3U8());
    const converted = editor.toM3U8();
    return original === converted;
  }
}
