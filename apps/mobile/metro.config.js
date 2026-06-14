const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch workspace packages for changes
config.watchFolders = [monorepoRoot]

// Resolve node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Support @/ alias at metro level
config.resolver.alias = {
  '@': path.resolve(projectRoot, 'src'),
}

module.exports = config
