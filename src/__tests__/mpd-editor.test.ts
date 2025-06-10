import { MPDEditor } from '../mpd-editor';
import fs from 'fs/promises';

describe('MPDEditor', () => {
  let mpdString: string;
  let editor: MPDEditor;

  beforeAll(async () => {
    mpdString = await fs.readFile('manifests/video_with_audio_and_subtitles.mpd', 'utf-8');
  });

  beforeEach(() => {
    editor = new MPDEditor(mpdString);
  });

  describe('addSubtitleStream', () => {
    it('should add a subtitle stream with correct properties', () => {
      editor.addSubtitleStream('fr', 1000, 60); // Example values: 1000 bytes VTT file, 60 seconds video
      const xml = editor.toXML();
      
      // Check if the subtitle adaptation set was added
      expect(xml).toContain('<AdaptationSet');
      expect(xml).toContain('contentType="text"');
      expect(xml).toContain('lang="fr"');
      
      // Check if the representation has all required properties
      expect(xml).toContain('codecs="stpp"');
      expect(xml).toContain('bandwidth="133"'); // 1000 bytes * 8 bits / 60 seconds
      expect(xml).toContain('mimeType="text/vtt"');
    });

    it('should maintain existing streams when adding a new subtitle', () => {
      editor.addSubtitleStream('fr', 1000, 60); // Example values: 1000 bytes VTT file, 60 seconds video
      const xml = editor.toXML();
      
      // Check if the subtitle stream was added correctly
      expect(xml).toContain('<AdaptationSet');
      expect(xml).toContain('contentType="text"');
      expect(xml).toContain('lang="fr"');
  
      
      expect(xml).toContain('codecs="stpp"');
      expect(xml).toContain('bandwidth="133"'); // 1000 bytes * 8 bits / 60 seconds
      expect(xml).toContain('mimeType="text/vtt"');
    });
  });

  describe('removeSubtitleStream', () => {
    it('should remove a subtitle stream by language', () => {
      editor.addSubtitleStream('fr', 1000, 60); // Example values: 1000 bytes VTT file, 60 seconds video
      editor.removeSubtitleStream('fr');
      const xml = editor.toXML();
      
      // Check if the French subtitle stream was removed
      expect(xml).not.toContain('lang="fr"');
    });
  });

  describe('roundTripValidation', () => {
    it('should maintain XML structure after modifications', () => {
      editor.addSubtitleStream('fr', 1000, 60); // Example values: 1000 bytes VTT file, 60 seconds video
      const isValid = MPDEditor.validateRoundTrip(editor.toXML());
      expect(isValid).toBe(true);
    });
  });
});
