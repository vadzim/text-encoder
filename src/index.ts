export interface TextEncoderEncodeOptions {
	stream?: boolean
}

export interface EncodeIntoResult {
	read: number
	written: number
}

export class TextEncoder {
	readonly #textEncoder = new globalThis.TextEncoder()
	#buffer = ''

	constructor() {
		// Constructor takes no parameters, matching standard TextEncoder
	}

	get encoding(): 'utf-8' {
		return 'utf-8'
	}

	encode(input: string = '', options?: TextEncoderEncodeOptions): Uint8Array {
		input = this.#buffer + input
		this.#buffer = ''

		if (
			input.length > 0 &&
			options?.stream &&
			isHighSurrogate(input.charCodeAt(input.length - 1))
		) {
			this.#buffer = input.slice(-1)
			input = input.slice(0, -1)
		}

		return this.#textEncoder.encode(input)
	}

	encodeInto(
		input: string,
		destination: Uint8Array,
		options?: TextEncoderEncodeOptions,
	): EncodeIntoResult {
		const initialBufferLength = this.#buffer.length

		input = this.#buffer + input
		this.#buffer = ''

		let size = 0
		let i = 0
		while (i < input.length) {
			const charSize = characterSize(input, i)
			if (size + charSize > destination.length) {
				break
			}
			size += charSize
			i++
		}

		if (options?.stream && isHighSurrogate(input.charCodeAt(i - 1))) {
			this.#buffer = input.slice(i - 1, i)
			input = input.slice(0, i - 1)
		} else {
			input = input.slice(0, i)
		}

		const read = i - initialBufferLength
		const { written } = this.#textEncoder.encodeInto(input, destination)

		return { read, written }
	}
}

function characterSize(text: string, index: number): number {
	const char = text.charCodeAt(index)

	if (char <= 0x7f) {
		return 1
	}

	if (char <= 0x7ff) {
		return 2
	}

	if (
		index < text.length - 1 &&
		isHighSurrogate(char) &&
		isLowSurrogate(text.charCodeAt(index + 1))
	) {
		return 4
	}

	if (index > 0 && isHighSurrogate(text.charCodeAt(index - 1)) && isLowSurrogate(char)) {
		return 0
	}

	return 3
}

function isHighSurrogate(char: number): boolean {
	return char >= 0xd800 && char <= 0xdbff
}

function isLowSurrogate(char: number): boolean {
	return char >= 0xdc00 && char <= 0xdfff
}
