# text-encoder-2

This is a replacement for the standard TextEncoder with fixed surrogate pairs support.

The standard TextEncoder can't handle Unicode surrogate pairs that are split across chunks when streaming data. This library fixes that by adding a `stream` option that properly buffers incomplete surrogate pairs.

**✅ 92% test coverage with 28 comprehensive test cases covering all edge cases**

## Installation

```bash
npm install text-encoder-2
```

## Usage

### Basic Usage (same as standard TextEncoder)

```typescript
import { TextEncoder } from 'text-encoder-2'

const encoder = new TextEncoder()
const bytes = encoder.encode('Hello 🚀')
```

### Stream Mode (the fix)

```typescript
const encoder = new TextEncoder()

// Split surrogate pair for 𝕳 character
const part1 = '\uD835'  // High surrogate
const part2 = '\uDD73'  // Low surrogate

// Without stream mode - broken
encoder.encode(part1) // ❌ [239, 191, 189] (replacement character)
encoder.encode(part2) // ❌ [239, 191, 189] (replacement character)

// With stream mode - fixed
encoder.encode(part1, { stream: true }) // ✅ [] (buffered)
encoder.encode(part2, { stream: true }) // ✅ [240, 157, 149, 179] (correct 𝕳)

// End stream to flush any pending data
encoder.encode('', { stream: false }) // or just encoder.encode('')
```

## API

Same as standard TextEncoder plus optional `stream` parameter:

```typescript
class TextEncoder {
  encode(input?: string, options?: { stream?: boolean }): Uint8Array
  encodeInto(input: string, destination: Uint8Array, options?: { stream?: boolean }): { read: number, written: number }
  readonly encoding: 'utf-8'
}
```

## Why This Matters

When processing Unicode text in chunks (like reading files or network streams), surrogate pairs can be split:

```
Chunk 1: "Hello \uD83D"     // High surrogate at end
Chunk 2: "\uDE80 World"     // Low surrogate at start
```

Standard TextEncoder breaks this into replacement characters. This library buffers the high surrogate until the next chunk arrives.

## License

MIT