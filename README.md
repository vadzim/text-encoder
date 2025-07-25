# TextEncoder

A TypeScript implementation of TextEncoder with streaming support for proper surrogate pair handling across chunk boundaries.

## Features

- **Standard TextEncoder API**: Compatible with the Web API TextEncoder interface
- **Stream Support**: Optional streaming mode that properly handles surrogate pairs split across chunks
- **TypeScript**: Full TypeScript support with strict type definitions
- **Zero Dependencies**: No external dependencies
- **Comprehensive Testing**: Extensive test suite covering edge cases

## Installation

```bash
npm install text-encoder
```

## Usage

### Basic Usage

```typescript
import { TextEncoder } from 'text-encoder'

const encoder = new TextEncoder()
const encoded = encoder.encode('Hello, World!')
console.log(encoded) // Uint8Array(13) [72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]
```

### Stream Mode

The key feature of this library is the stream mode, which properly handles Unicode surrogate pairs that might be split across chunk boundaries:

```typescript
import { TextEncoder } from 'text-encoder'

const encoder = new TextEncoder()

// Simulate chunks where a surrogate pair is split
const highSurrogate = '\ud835' // High surrogate of 𝕳
const lowSurrogate = '\udd73' // Low surrogate of 𝕳

// First chunk - contains only high surrogate
const result1 = encoder.encode(highSurrogate, { stream: true })
console.log(result1) // Uint8Array(0) [] - empty, waiting for low surrogate

// Second chunk - contains low surrogate
const result2 = encoder.encode(lowSurrogate, { stream: true })
console.log(result2) // Uint8Array(4) [240, 157, 149, 179] - complete UTF-8 for 𝕳
```

### API

#### Constructor

```typescript
new TextEncoder()
```

The constructor takes no parameters, matching the standard Web API TextEncoder.

#### Methods

##### `encode(input?: string, options?: TextEncoderEncodeOptions): Uint8Array`

Encodes a string into UTF-8 bytes.

**Parameters:**

- `input` - The string to encode (default: empty string)
- `options` - Encoding options
  - `stream?: boolean` - Enable streaming mode for proper surrogate pair handling (default: `false`)

**Returns:** `Uint8Array` containing the UTF-8 encoded bytes

##### `encodeInto(input: string, destination: Uint8Array, options?: TextEncoderEncodeOptions): EncodeIntoResult`

Encodes a string into a provided Uint8Array buffer.

**Parameters:**

- `input` - The string to encode
- `destination` - The target Uint8Array buffer
- `options` - Encoding options (same as `encode` method)

**Returns:** Object with `read` (characters processed) and `written` (bytes written) properties

##### `encoding: string`

Returns the encoding format (always `'utf-8'`).

## Stream Mode vs Normal Mode

### Normal Mode (Default)

In normal mode, each call to `encode()` is independent. This matches the behavior of the standard Web API TextEncoder:

```typescript
const encoder = new TextEncoder()
encoder.encode('Hello') // Independent encoding
encoder.encode('World') // Independent encoding - no state maintained
```

### Stream Mode

In stream mode, the encoder maintains state between calls to handle surrogate pairs correctly:

```typescript
const encoder = new TextEncoder()

// These calls maintain state to handle split surrogate pairs
encoder.encode('Hello ', { stream: true })
encoder.encode(highSurrogate, { stream: true }) // Stored internally
encoder.encode(lowSurrogate + ' World', { stream: true }) // Combined with previous high surrogate
```

### Key Differences

```typescript
const encoder1 = new TextEncoder()
const encoder2 = new TextEncoder()

const highSurrogate = '\ud835'
const lowSurrogate = '\udd73'

// Normal mode: each call is independent
const result1 = encoder1.encode(highSurrogate) // [239, 191, 189] - replacement character
const result2 = encoder1.encode(lowSurrogate) // [239, 191, 189] - replacement character

// Stream mode: state is maintained between calls
const result3 = encoder2.encode(highSurrogate, { stream: true }) // [] - waiting for low surrogate
const result4 = encoder2.encode(lowSurrogate, { stream: true }) // [240, 157, 149, 179] - complete character
```

### Flushing the Buffer

When you need to flush any pending high surrogate (end of stream), use `stream: false` or skip the options:

```typescript
const encoder = new TextEncoder()

// Stream some data
encoder.encode('Hello ', { stream: true })
encoder.encode(highSurrogate, { stream: true }) // Buffered

// End of stream - flush the buffer (both approaches work)
encoder.encode('', { stream: false }) // [239, 191, 189] - replacement character for orphaned high surrogate
encoder.encode() // Same as above - defaults to stream: false

// Or flush with additional data
encoder.encode('World', { stream: false }) // Flushes buffer + encodes 'World'
encoder.encode('World') // Same as above - defaults to stream: false
```

## Unicode Support

This library fully supports Unicode, including:

- **Basic Multilingual Plane (BMP)** characters (U+0000 to U+FFFF)
- **Supplementary Planes** characters (U+10000 to U+10FFFF) via surrogate pairs
- **Proper error handling** for malformed surrogate pairs (replaced with U+FFFD)

### Examples

```typescript
const encoder = new TextEncoder()

// ASCII
encoder.encode('Hello') // [72, 101, 108, 108, 111]

// Latin-1 Supplement
encoder.encode('café') // [99, 97, 102, 195, 169]

// CJK
encoder.encode('你好') // [228, 189, 160, 229, 165, 189]

// Emoji (surrogate pair)
encoder.encode('🚀') // [240, 159, 154, 128]

// Mathematical Alphanumeric Symbols
encoder.encode('𝕳𝖊𝖑𝖑𝖔') // Multiple 4-byte sequences
```

## Error Handling

### Malformed Surrogate Pairs

When encountering malformed surrogate pairs, the encoder follows Unicode standards by replacing them with the replacement character (U+FFFD):

```typescript
const encoder = new TextEncoder()

// Orphaned high surrogate followed by regular character
encoder.encode(String.fromCharCode(0xd835), { stream: true }) // High surrogate stored
encoder.encode('A', { stream: true }) // Outputs replacement character + 'A'

// Orphaned low surrogate
encoder.encode(String.fromCharCode(0xdc00)) // Outputs replacement character

// High surrogate followed by another high surrogate
encoder.encode(String.fromCharCode(0xd835, 0xd836)) // Two replacement characters
```

## TypeScript

This library is written in TypeScript with the strictest possible configuration:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`
- `noUncheckedIndexedAccess: true`
- And many more strict options

All types are fully exported:

```typescript
import { TextEncoder, TextEncoderEncodeOptions, EncodeIntoResult } from 'text-encoder'
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Implementation

This library uses the native `TextEncoder` internally for optimal performance and compatibility. The streaming functionality is implemented using a unified buffer approach with modern JavaScript features:

```typescript
// Core implementation using private fields and unified logic:
class TextEncoder {
	readonly #textEncoder = new globalThis.TextEncoder()
	#buffer = ''

	encode(input: string = '', options?: TextEncoderEncodeOptions): Uint8Array {
		input = this.#buffer + input
		this.#buffer = ''

		if (input.length > 0 && options?.stream && isHighSurrogate(input.slice(-1))) {
			this.#buffer = input.slice(-1)
			input = input.slice(0, -1)
		}

		return this.#textEncoder.encode(input)
	}
}
```

This approach ensures:

- **Performance**: Uses native TextEncoder for actual encoding
- **Security**: Private fields (`#`) provide true encapsulation
- **Simplicity**: Unified logic for both stream and non-stream modes
- **Accuracy**: Proper UTF-8 byte size calculation for `encodeInto`
- **Compatibility**: Works in any environment where TextEncoder is available

## Compatibility

This library works in both Node.js and browser environments with the following requirements:

- **TextEncoder Support**: Native `TextEncoder` must be available in the global scope
- **Private Fields Support**: ES2022 private fields (`#`) - supported in:
  - **Node.js**: 14.6.0+
  - **Chrome**: 74+
  - **Firefox**: 90+
  - **Safari**: 14.1+
  - **Edge**: 79+

## Comparison with Standard TextEncoder

| Feature                               | Standard TextEncoder | This Library          |
| ------------------------------------- | -------------------- | --------------------- |
| Basic encoding                        | ✅                   | ✅                    |
| `encodeInto` method                   | ✅                   | ✅                    |
| Stream mode                           | ❌                   | ✅                    |
| Surrogate pair handling across chunks | ❌                   | ✅                    |
| Constructor options                   | ❌                   | ❌ (matches standard) |
| Method options                        | ❌                   | ✅                    |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

**vadzim** (vadzimzienka@gmail.com)

## Repository

[https://github.com/vadzim/text-encoder](https://github.com/vadzim/text-encoder)
