[![Test Status](https://github.com/gumlet/video-manifest-parser/actions/workflows/test.yml/badge.svg)](https://github.com/gumlet/video-manifest-parser/actions/workflows/test.yml)

> **Note:** This package does not handle segmentation or encryption of media files like [Shaka Packager](https://github.com/shaka-project/shaka-packager). It is intended as a quick tool for editing manifests and removing already segmented streams. 
>
> It currently honors HLS and DASH specifications as followed by Shaka Packager.

# Manifest Editor

A TypeScript library for manipulating MPD (MPEG-DASH) and M3U8 (HLS) manifest/master playlist files.

## Features

- Parse and modify MPD (MPEG-DASH) manifests
- Parse and modify M3U8 (HLS) master playlists
- Support for multiple media types (video, audio, subtitles)
- Automatic ID generation for new elements
- Type-safe API with TypeScript interfaces

## Installation

```bash
npm install @gumlet/video-manifest-parser
```

## Usage

### MPD Editor

```typescript
import { MPDEditor } from '@gumlet/video-manifest-parser';

// Parse MPD manifest
const editor = new MPDEditor(mpdString);

// Add new adaptation set
const newAdaptationSet = {
  '@contentType': 'video',
  '@width': '1920',
  '@height': '1080',
  Representation: {
    '@bandwidth': '5000000',
    '@codecs': 'avc1.640028',
    '@mimeType': 'video/mp4'
  }
};

editor.addAdaptationSet(newAdaptationSet);

// Get modified MPD string
const updatedMpd = editor.toString();
```

### M3U8 Editor

```typescript
import { M3U8Editor } from '@gumlet/video-manifest-parser';

// Parse M3U8 playlist
const editor = new M3U8Editor(m3u8String);

// Add new media stream
const newStream: StreamInfo = {
  bandwidth: 5000000,
  codecs: 'avc1.640028',
  resolution: { width: 1920, height: 1080 },
  frameRate: '30.000'
};

editor.addStream(newStream);

// Get modified M3U8 string
const updatedM3U8 = editor.toString();
```

## API Reference

### MPDEditor

```typescript
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
```

### M3U8Editor

```typescript
interface StreamInfo {
  bandwidth: number;
  codecs: string;
  resolution?: { width: number; height: number };
  frameRate?: string;
  videoRange?: string;
  audio?: string;
  subtitles?: string;
  closedCaptions?: string;
}

interface Media {
  type: 'AUDIO' | 'SUBTITLES' | 'CLOSED_CAPTIONS';
  group_id: string;
  language: string;
  name: string;
  uri: string;
  default?: boolean;
  autoselect?: boolean;
  channels?: number;
}
```

## Dependencies

- `fast-xml-parser`: For parsing and building MPD XML
- `m3u8-parser`: For parsing M3U8 playlists
- `typescript`: For type definitions and compilation
