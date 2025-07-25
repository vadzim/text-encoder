module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	extends: ['eslint:recommended'],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module',
	},
	rules: {
		'@typescript-eslint/no-unused-vars': 'error',
		'prefer-const': 'error',
		'no-var': 'error',
		'no-undef': 'off',
		semi: ['error', 'never'],
		'comma-dangle': ['error', 'always-multiline'],
	},
}