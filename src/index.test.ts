import { TextEncoder } from './index'

describe('TextEncoder', () => {
	describe('Basic functionality', () => {
		it('should create an instance with no constructor parameters', () => {
			const encoder = new TextEncoder()
			expect(encoder.encoding).toBe('utf-8')
		})

		it('should encode ASCII text correctly', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('hello')
			expect(result).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
		})

		it('should encode empty string', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('')
			expect(result).toEqual(new Uint8Array([]))
		})

		it('should encode undefined as empty string', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode()
			expect(result).toEqual(new Uint8Array([]))
		})
	})

	describe('Unicode encoding', () => {
		it('should encode 2-byte UTF-8 characters', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('café')
			expect(result).toEqual(new Uint8Array([99, 97, 102, 195, 169]))
		})

		it('should encode 3-byte UTF-8 characters', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('你好')
			expect(result).toEqual(new Uint8Array([228, 189, 160, 229, 165, 189]))
		})

		it('should encode 4-byte UTF-8 characters (emojis)', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('🚀')
			expect(result).toEqual(new Uint8Array([240, 159, 154, 128]))
		})
	})

	describe('Non-stream mode (default)', () => {
		it('should handle surrogate pairs correctly in non-stream mode', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('𝕳𝖊𝖑𝖑𝖔') // Mathematical bold characters
			expect(result.length).toBeGreaterThan(5)
		})

		it('should handle each encode call independently', () => {
			const encoder = new TextEncoder()
			const result1 = encoder.encode('Hello')
			const result2 = encoder.encode('World')

			expect(result1).toEqual(new Uint8Array([72, 101, 108, 108, 111]))
			expect(result2).toEqual(new Uint8Array([87, 111, 114, 108, 100]))
		})
	})

	describe('Stream mode', () => {
		it('should handle complete surrogate pairs in stream mode', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('𝕳𝖊𝖑𝖑𝖔', { stream: true })
			expect(result.length).toBeGreaterThan(5)
		})

		it('should handle split surrogate pairs across chunks', () => {
			const encoder = new TextEncoder()

			// Split the surrogate pair for 𝕳 (U+1D573)
			const highSurrogate = String.fromCharCode(0xd835) // High surrogate
			const lowSurrogate = String.fromCharCode(0xdd73) // Low surrogate

			// First chunk contains only high surrogate
			const result1 = encoder.encode(highSurrogate, { stream: true })
			expect(result1).toEqual(new Uint8Array([])) // Should be empty, waiting for low surrogate

			// Second chunk contains low surrogate
			const result2 = encoder.encode(lowSurrogate, { stream: true })
			expect(result2).toEqual(new Uint8Array([240, 157, 149, 179])) // Complete UTF-8 for 𝕳
		})

		it('should handle orphaned high surrogate', () => {
			const encoder = new TextEncoder()

			const highSurrogate = String.fromCharCode(0xd835)
			const regularChar = 'A'

			// First chunk: high surrogate
			const result1 = encoder.encode(highSurrogate, { stream: true })
			expect(result1).toEqual(new Uint8Array([]))

			// Second chunk: regular character (not low surrogate)
			const result2 = encoder.encode(regularChar, { stream: true })
			// Should output replacement character (0xFFFD) + 'A'
			expect(result2).toEqual(new Uint8Array([239, 191, 189, 65]))
		})

		it('should handle orphaned low surrogate', () => {
			const encoder = new TextEncoder()

			const lowSurrogate = String.fromCharCode(0xdc00)
			const result = encoder.encode(lowSurrogate, { stream: true })

			// Should output replacement character (0xFFFD)
			expect(result).toEqual(new Uint8Array([239, 191, 189]))
		})

		it('should handle multiple chunks with mixed content', () => {
			const encoder = new TextEncoder()

			const chunk1 = 'Hello '
			const chunk2 = String.fromCharCode(0xd835) // High surrogate
			const chunk3 = String.fromCharCode(0xdd73) + ' World' // Low surrogate + text

			const result1 = encoder.encode(chunk1, { stream: true })
			const result2 = encoder.encode(chunk2, { stream: true })
			const result3 = encoder.encode(chunk3, { stream: true })

			expect(result1).toEqual(new Uint8Array([72, 101, 108, 108, 111, 32]))
			expect(result2).toEqual(new Uint8Array([]))
			expect(result3).toEqual(new Uint8Array([240, 157, 149, 179, 32, 87, 111, 114, 108, 100]))
		})

		it('should maintain state across multiple encode calls', () => {
			const encoder = new TextEncoder()

			// Test that the encoder maintains its state
			encoder.encode('test', { stream: true })
			encoder.encode(String.fromCharCode(0xd835), { stream: true })
			const result = encoder.encode(String.fromCharCode(0xdd73), { stream: true })

			expect(result).toEqual(new Uint8Array([240, 157, 149, 179])) // Complete UTF-8 for 𝕳
		})

		it('should flush pending high surrogate when stream: false', () => {
			const encoder = new TextEncoder()

			// Set up pending high surrogate in stream mode
			const result1 = encoder.encode(String.fromCharCode(0xd835), { stream: true })
			expect(result1).toEqual(new Uint8Array([])) // Nothing output, buffered

			// Flush by using stream: false
			const result2 = encoder.encode('A', { stream: false })
			expect(result2).toEqual(new Uint8Array([239, 191, 189, 65])) // Replacement char + 'A'
		})

		it('should handle empty input in stream mode without flushing', () => {
			const encoder = new TextEncoder()

			// Set up pending high surrogate
			encoder.encode(String.fromCharCode(0xd835), { stream: true })

			// Empty input in stream mode should not flush
			const result = encoder.encode('', { stream: true })
			expect(result).toEqual(new Uint8Array([])) // Still nothing, high surrogate still buffered

			// Verify the high surrogate is still there by providing low surrogate
			const result2 = encoder.encode(String.fromCharCode(0xdd73), { stream: true })
			expect(result2).toEqual(new Uint8Array([240, 157, 149, 179])) // Complete character
		})
	})

	describe('Flush behavior', () => {
		it('should flush buffer when switching from stream to non-stream mode', () => {
			const encoder = new TextEncoder()

			// Build up some content in stream mode
			encoder.encode('Hello ', { stream: true })
			encoder.encode(String.fromCharCode(0xd835), { stream: true }) // High surrogate buffered

			// Switch to non-stream mode should flush everything
			const result = encoder.encode('World', { stream: false })
			// Should contain: orphaned high surrogate (as replacement char) + 'World'
			expect(result).toEqual(new Uint8Array([239, 191, 189, 87, 111, 114, 108, 100]))
		})

		it('should handle buffer flush with empty string', () => {
			const encoder = new TextEncoder()

			// Set up buffered high surrogate
			encoder.encode(String.fromCharCode(0xd835), { stream: true })

			// Flush with empty string using stream: false
			const result = encoder.encode('', { stream: false })
			expect(result).toEqual(new Uint8Array([239, 191, 189])) // Just replacement char
		})
	})

	describe('Stream vs Non-stream behavior difference', () => {
		it('should behave differently for split surrogates in stream vs non-stream mode', () => {
			const encoder1 = new TextEncoder()
			const encoder2 = new TextEncoder()

			const highSurrogate = String.fromCharCode(0xd835)
			const lowSurrogate = String.fromCharCode(0xdd73)

			// Non-stream mode: each call is independent
			const nonStream1 = encoder1.encode(highSurrogate) // Orphaned high surrogate
			const nonStream2 = encoder1.encode(lowSurrogate) // Orphaned low surrogate

			expect(nonStream1).toEqual(new Uint8Array([239, 191, 189])) // Replacement char
			expect(nonStream2).toEqual(new Uint8Array([239, 191, 189])) // Replacement char

			// Stream mode: state is maintained between calls
			const stream1 = encoder2.encode(highSurrogate, { stream: true }) // Pending
			const stream2 = encoder2.encode(lowSurrogate, { stream: true }) // Combined

			expect(stream1).toEqual(new Uint8Array([])) // Empty, waiting
			expect(stream2).toEqual(new Uint8Array([240, 157, 149, 179])) // Complete character
		})
	})

	describe('encodeInto method', () => {
		it('should encode into provided buffer', () => {
			const encoder = new TextEncoder()
			const source = 'hello'
			const destination = new Uint8Array(10)

			const result = encoder.encodeInto(source, destination)

			expect(result.read).toBe(5)
			expect(result.written).toBe(5)
			expect(destination.slice(0, 5)).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
		})

		it('should handle buffer overflow', () => {
			const encoder = new TextEncoder()
			const source = 'hello world'
			const destination = new Uint8Array(5)

			const result = encoder.encodeInto(source, destination)

			expect(result.read).toBe(5)
			expect(result.written).toBe(5)
			expect(destination).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
		})

		it('should handle unicode characters in encodeInto', () => {
			const encoder = new TextEncoder()
			const source = 'café'
			const destination = new Uint8Array(10)

			const result = encoder.encodeInto(source, destination)

			expect(result.read).toBe(4)
			expect(result.written).toBe(5)
			expect(destination.slice(0, 5)).toEqual(new Uint8Array([99, 97, 102, 195, 169]))
		})

		it('should support stream option in encodeInto', () => {
			const encoder = new TextEncoder()
			const source = String.fromCharCode(0xd835) // High surrogate
			const destination = new Uint8Array(10)

			const result = encoder.encodeInto(source, destination, { stream: true })

			expect(result.read).toBe(1)
			expect(result.written).toBe(0) // Nothing written, waiting for low surrogate
		})
	})

	describe('Edge cases', () => {
		it('should handle null bytes', () => {
			const encoder = new TextEncoder()
			const result = encoder.encode('hello\\0world')
			expect(result).toEqual(
				new Uint8Array([104, 101, 108, 108, 111, 92, 48, 119, 111, 114, 108, 100]),
			)
		})

		it('should handle very long strings', () => {
			const encoder = new TextEncoder()
			const longString = 'a'.repeat(10000)
			const result = encoder.encode(longString)
			expect(result.length).toBe(10000)
			expect(result.every((byte) => byte === 97)).toBe(true)
		})

		it('should handle mixed content with surrogates in stream mode', () => {
			const encoder = new TextEncoder()

			const result1 = encoder.encode('A' + String.fromCharCode(0xd835), { stream: true })
			const result2 = encoder.encode(String.fromCharCode(0xdd73) + 'B', { stream: true })

			expect(result1).toEqual(new Uint8Array([65])) // Just 'A'
			expect(result2).toEqual(new Uint8Array([240, 157, 149, 179, 66])) // 𝕳 + 'B'
		})

		it('should handle malformed surrogate sequences', () => {
			const encoder = new TextEncoder()

			// High surrogate followed by another high surrogate
			const malformed1 = String.fromCharCode(0xd835, 0xd836)
			const result1 = encoder.encode(malformed1)
			expect(result1).toEqual(new Uint8Array([239, 191, 189, 239, 191, 189])) // Two replacement chars

			// Low surrogate followed by high surrogate
			const malformed2 = String.fromCharCode(0xdc00, 0xd835)
			const result2 = encoder.encode(malformed2)
			expect(result2).toEqual(new Uint8Array([239, 191, 189, 239, 191, 189])) // Two replacement chars
		})
	})
})
