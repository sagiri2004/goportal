import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(currentDir, '..')
const source = resolve(root, 'dist/browser/goportal-game-sdk.global.js')
const target = resolve(root, 'browser/goportal-game-sdk.js')

await mkdir(dirname(target), { recursive: true })
await copyFile(source, target)

console.log(`Copied browser bundle to ${target}`)
