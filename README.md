# text-encoder-2

This is a replacement for the standard TextEncoder with fixed **surrogate pairs (emojis)** support.

The standard TextEncoder can't handle Unicode **surrogate pairs (emojis)** that are split across chunks when streaming data. This library fixes that by adding a `stream` option that properly buffers incomplete surrogate pairs.

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

// Split surrogate pair for 🚀 character
const part1 = '\uD83D'  // High surrogate
const part2 = '\uDE80'  // Low surrogate

// Without stream mode - broken
bytes1 = encoder.encode(part1) // ❌ [239, 191, 189] (replacement character)
bytes2 = encoder.encode(part2) // ❌ [239, 191, 189] (replacement character)

// With stream mode - fixed
bytes1 = encoder.encode(part1, { stream: true }) // ✅ [] (buffered)
bytes2 = encoder.encode(part2, { stream: true }) // ✅ [240, 159, 154, 128] (correct 🚀)

// End stream to flush any pending data
rest = encoder.encode('', { stream: false })
// or just
rest = encoder.encode()
```

## API

Same as standard TextEncoder plus optional `stream` parameter:

```typescript
class TextEncoder {
  encode(input?: string, options?: { stream?: boolean }): Uint8Array
  encodeInto(input: string, destination: Uint8Array, options?: { stream?: boolean }): { read: number, written: number }
  get encoding(): 'utf-8'
}
```

## Why This Matters

When processing Unicode text in chunks (like reading files or network streams), surrogate pairs can be split:

```
Chunk 1: "Hello \uD83D"     // High surrogate at end
Chunk 2: "\uDE80 World"     // Low surrogate at start
```

**Standard TextEncoder result:**
```
encode(chunk1) → "Hello �"      // Broken! High surrogate becomes �
encode(chunk2) → "� World"      // Broken! Low surrogate becomes �
Final result:    "Hello � � World"
```

**This library result:**
```
encode(chunk1, {stream: true}) → "Hello "     // High surrogate buffered
encode(chunk2, {stream: true}) → "🚀 World"   // Combined into correct emoji
Final result:                    "Hello 🚀 World"
```

## License

MIT