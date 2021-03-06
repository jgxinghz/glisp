import seedrandom from 'seedrandom'
import {
	MalVal,
	markMalVector as V,
	symbolFor as S,
	MalMap,
	cloneExp,
	assocBang,
	isMap,
	isString,
	isSymbol,
	isKeyword,
	keywordFor,
	LispError,
	MalFunc,
	isVector,
	isList,
	MalAtom,
	getType,
	getMeta,
	withMeta,
	isSeq
} from '@/mal/types'
import printExp from '@/mal/printer'
import {partition} from '@/utils'
import isNode from 'is-node'

const Exports = [
	['type', x => keywordFor(getType(x) as string)],
	['nil?', (x: MalVal) => x === null],
	['true?', (x: MalVal) => x === true],
	['false?', (x: MalVal) => x === false],
	['boolean?', (x: MalVal) => typeof x === 'boolean'],
	['number?', (x: MalVal) => typeof x === 'number'],
	['string?', isString],
	['keyword?', isKeyword],
	['fn?', (x: MalVal) => getType(x) === 'fn'],
	['macro?', (x: MalVal) => getType(x) === 'macro'],

	['keyword', keywordFor],
	['symbol', S],
	['symbol?', isSymbol],

	// // Compare
	['=', (a: MalVal, b: MalVal) => a === b],
	['not=', (a: MalVal, b: MalVal) => a !== b],
	['<', (a: number, b: number) => a < b],
	['<=', (a: number, b: number) => a <= b],
	['>', (a: number, b: number) => a > b],
	['>=', (a: number, b: number) => a >= b],

	// Calculus
	['+', (...a: number[]) => a.reduce((x, y) => x + y, 0)],
	[
		'-',
		(x: number, ...ys: number[]) =>
			ys.length ? ys.reduce((a, b) => a - b, x) : -x
	],
	['*', (...args: number[]) => args.reduce((a, b) => a * b, 1)],
	[
		'/',
		(x: number, ...ys: number[]) =>
			ys.length ? ys.reduce((a, b) => a / b, x) : 1 / x
	],
	['mod', (x: number, y: number) => ((x % y) + y) % y],

	// Array
	['list', (...xs: MalVal[]) => xs],
	['list?', isList],

	['vector', (...xs: MalVal[]) => V(xs)],
	['vector?', isVector],
	['vec', (a: MalVal[]) => V([...a])],
	['sequential?', isSeq],
	[
		'seq',
		(a: MalVal) => {
			if (isSeq(a)) {
				return [...a]
			} else if (isString(a) && a.length > 0) {
				return a.split('')
			} else if (isMap(a)) {
				return Object.entries(a).map(entry => V(entry))
			} else {
				return null
			}
		}
	],
	[
		'nth',
		(a: MalVal[], i: number) => {
			if (typeof i !== 'number') {
				throw new LispError('[nth] Index should be specified by number')
			} else if (i < 0) {
				if (-i <= a.length) {
					return a[a.length - i]
				} else {
					throw new LispError('[nth] index out of range')
				}
			} else {
				if (i < a.length) {
					return a[i]
				} else {
					throw new LispError('[nth] index out of range')
				}
			}
		}
	],
	['first', (a: MalVal[]) => (a !== null && a.length > 0 ? a[0] : null)],
	['rest', (a: MalVal[]) => (a === null ? [] : a.slice(1))],
	[
		'last',
		(a: MalVal[]) => (a !== null && a.length > 0 ? a[a.length - 1] : null)
	],
	['butlast', (a: MalVal[]) => (a === null ? [] : a.slice(0, a.length - 1))],
	['count', (a: MalVal[]) => (a === null ? 0 : a.length)],
	[
		'slice',
		(a: MalVal[], start: number, end: number) => {
			if (isSeq(a)) {
				return a.slice(start, end)
			} else {
				throw new LispError(`[slice] ${printExp(a)} is not an array`)
			}
		}
	],
	[
		'apply',
		(f: MalFunc, ...a: MalVal[]) => f(...a.slice(0, -1).concat(a[a.length - 1]))
	],
	['map', (f: MalFunc, a: MalVal[]) => V(a.map(x => f(x)))],
	['map-indexed', (f: MalFunc, a: MalVal[]) => V(a.map((x, i) => f(i, x)))],
	['filter', (f: MalFunc, a: MalVal[]) => a.filter(x => f(x))],
	['remove', (f: MalFunc, a: MalVal[]) => a.filter(x => !f(x))],
	['sort', (coll: MalVal[]) => V(coll.sort())],
	['partition', partition],
	['index-of', (value: MalVal[] | string, a: string) => value.indexOf(a)],
	[
		'last-index-of',
		(value: MalVal[] | string, a: string) => value.lastIndexOf(a)
	],
	['repeat', (a: MalVal, n: number) => Array(n).fill(a)],
	['reverse', (coll: MalVal[]) => coll.reverse()],
	['cons', (a: MalVal, b: MalVal) => [a].concat(b)],
	[
		'conj',
		(lst: MalVal, ...args: MalVal[]) => {
			if (isList(lst)) {
				const newList = [...lst]
				args.forEach(arg => newList.unshift(arg))
				return newList
			} else if (isVector(lst)) {
				return V([...lst, ...args])
			}
		}
	],
	['push', (a: MalVal[], ...b: MalVal[]) => [...a, ...b]],
	['concat', (...args: MalVal[]) => [].concat(...(args as any))],
	[
		'join',
		(separator: string, coll: MalVal[]) =>
			coll.map(v => printExp(v, false)).join(separator)
	],

	// Map
	['hash-map', (...a: MalVal[]) => assocBang({}, ...a)],
	['map?', isMap],
	['assoc', (m: MalMap, ...a: MalVal[]) => ({...m, ...assocBang({}, ...a)})],
	[
		'dissoc',
		(m: MalMap, ...a: string[]) => {
			const n = cloneExp(m) as MalMap
			a.forEach(k => delete n[k])
			return n
		}
	],
	[
		'get',
		(m: MalMap, a: string, notfound: MalVal = null) => {
			if (isMap(m)) {
				return a in m ? m[a] : notfound
			} else {
				return notfound
			}
		}
	],
	[
		'contains?',
		(m: MalMap, a: MalVal) => (typeof a === 'string' ? a in m : false)
	],
	['keys', (a: MalMap) => Object.keys(a)],
	['vals', (a: MalMap) => Object.values(a)],
	['entries', (a: MalMap) => V(Object.entries(a).map(pair => V(pair)))],

	// String
	['pr-str', (...a: MalVal[]) => a.map(e => printExp(e, true)).join(' ')],
	['str', (...a: MalVal[]) => a.map(e => printExp(e, false)).join('')],
	['subs', (a: string, from: number, to?: number) => a.substr(from, to)],

	// Meta
	['meta', getMeta],
	['with-meta', withMeta],
	['with-meta-sugar', (m: any, a: MalVal) => withMeta(a, m)],
	[
		// Atom
		'atom',
		(a: MalVal) => new MalAtom(a)
	],
	['atom?', (a: MalVal) => a instanceof MalAtom],
	['deref', (atm: MalAtom) => atm.val],
	['reset!', (atm: MalAtom, a: MalVal) => (atm.val = a)],
	[
		'swap!',
		(atm: MalAtom, fn: MalFunc, ...args: any) =>
			(atm.val = fn(...[atm.val].concat(args)))
	],

	// Other useful functions in JS
	['time-ms', Date.now],
	[
		'range',
		(...args: number[]) => {
			const ret = []
			let start = 0,
				end = 0,
				step = Math.sign(end - start)
			if (args.length === 1) {
				;[end] = args
			} else if (args.length === 2) {
				;[start, end] = args
			} else {
				;[start, end, step] = args
			}
			if (start !== end) {
				if ((end - start) * step <= 0) {
					step = Math.sign(end - start) * Math.abs(step) || 1
				}
				for (let i = start; step > 0 ? i < end : i > end; i += step) {
					ret.push(i)
				}
			}
			return V(ret)
		}
	],
	// Random
	['rnd', (a: MalVal) => seedrandom(a)()],

	// I/O
	[
		'spit',
		(f: MalVal, content: MalVal) => {
			if (isNode) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const fs = require('fs')
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const path = require('path')
				fs.writeFileSync(
					path.join(process.cwd(), f) as string,
					content as string
				)
			} else {
				throw new LispError('Cannot spit on browser')
			}

			return null
		}
	]
] as [string, MalVal][]

// Expose Math
Object.getOwnPropertyNames(Math).forEach(k =>
	Exports.push([k, (Math as any)[k]])
)

const Exp = [S('do'), ...Exports.map(([sym, body]) => [S('def'), S(sym), body])]
;(globalThis as any)['glisp_library'] = Exp

export default Exp
