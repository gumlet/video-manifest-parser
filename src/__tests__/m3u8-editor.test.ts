import { M3U8Editor } from '../m3u8-editor';
import fs from 'fs/promises';

// Helper function to create a complete manifest with playlists
describe('M3U8Editor', () => {
    let m3u8String: { [key: string]: string } = {};

    beforeAll(async () => {
        for (const file of (await fs.readdir('manifests')).filter((file) => file.endsWith('.m3u8'))) {
            m3u8String[file.split('.')[0]] = await fs.readFile(`manifests/${file}`, 'utf-8');
        }
    });

    describe('Basic Parsing', () => {
        it('should parse a valid M3U8 manifest', () => {
            const editor = new M3U8Editor(m3u8String['video_with_audio_and_subtitles']);
            expect(editor.toM3U8()).toBe(m3u8String['video_with_audio_and_subtitles']);
        });
    });
});
