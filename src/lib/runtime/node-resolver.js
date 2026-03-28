"use strict";
/**
 * Node.js Runtime Resolver
 *
 * Resolves the Node.js executable path with the following priority:
 * 1. Bundled Node.js (resources/node/node.exe)
 * 2. System Node.js (from PATH)
 * 3. Error if neither found
 *
 * Supports both development (project root) and production (Electron) environments.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNodePath = resolveNodePath;
exports.getNodeRuntimeInfo = getNodeRuntimeInfo;
exports.validateNodeRuntime = validateNodeRuntime;
exports.getNodeVersion = getNodeVersion;
exports.getNpmPath = getNpmPath;
exports.getNpxPath = getNpxPath;
exports.clearCache = clearCache;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Cache resolved path to avoid repeated file system checks
let cachedNodePath = null;
let cachedRuntimeInfo = null;
/**
 * Resolve Node.js executable path
 *
 * @returns Absolute path to node.exe
 * @throws Error if Node.js runtime cannot be found
 */
function resolveNodePath() {
    if (cachedNodePath) {
        return cachedNodePath;
    }
    // Try bundled Node.js first
    const bundledNodePath = getBundledNodePath();
    if (bundledNodePath && validateNodeRuntime(bundledNodePath)) {
        cachedNodePath = bundledNodePath;
        return bundledNodePath;
    }
    // Fall back to system Node.js
    const systemNodePath = getSystemNodePath();
    if (systemNodePath && validateNodeRuntime(systemNodePath)) {
        cachedNodePath = systemNodePath;
        console.warn('[Node Resolver] Using system Node.js (bundled runtime not found)');
        return systemNodePath;
    }
    // Neither found - critical error
    throw new Error('Node.js runtime not found!\n' +
        'Please ensure either:\n' +
        '1. Bundled Node.js is present at resources/node/node.exe, OR\n' +
        '2. Node.js is installed on your system and available in PATH');
}
/**
 * Get full runtime information (path, version, source, npm, npx)
 *
 * @returns NodeRuntimeInfo object
 * @throws Error if Node.js runtime cannot be found
 */
function getNodeRuntimeInfo() {
    if (cachedRuntimeInfo) {
        return cachedRuntimeInfo;
    }
    const nodePath = resolveNodePath();
    const version = getNodeVersion(nodePath) || 'unknown';
    const source = nodePath.includes('resources\\node') ? 'bundled' : 'system';
    const npm = getNpmPath(nodePath);
    const npx = getNpxPath(nodePath);
    cachedRuntimeInfo = {
        path: nodePath,
        version,
        source,
        npm,
        npx,
    };
    return cachedRuntimeInfo;
}
/**
 * Validate that a Node.js executable is functional
 *
 * @param nodePath Path to node.exe
 * @returns true if executable exists and can run --version
 */
function validateNodeRuntime(nodePath) {
    try {
        // Check if file exists
        if (!fs.existsSync(nodePath)) {
            return false;
        }
        // Try to execute --version command
        const version = (0, child_process_1.execSync)(`"${nodePath}" --version`, {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true,
        });
        // Valid Node.js should return version string starting with 'v'
        return version.trim().startsWith('v');
    }
    catch (error) {
        return false;
    }
}
/**
 * Get Node.js version string
 *
 * @param nodePath Path to node.exe
 * @returns Version string (e.g., "v20.11.0") or null if failed
 */
function getNodeVersion(nodePath) {
    try {
        const version = (0, child_process_1.execSync)(`"${nodePath}" --version`, {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true,
        });
        return version.trim();
    }
    catch (error) {
        return null;
    }
}
/**
 * Get npm executable path based on Node.js path
 *
 * @param nodePath Path to node.exe
 * @returns Absolute path to npm.cmd (or npm on Unix)
 */
function getNpmPath(nodePath) {
    const resolvedNodePath = nodePath || resolveNodePath();
    const nodeDir = path.dirname(resolvedNodePath);
    // For bundled Node.js, npm.cmd is in the same directory
    if (resolvedNodePath.includes('resources\\node')) {
        const npmCmd = path.join(nodeDir, 'npm.cmd');
        if (fs.existsSync(npmCmd)) {
            return npmCmd;
        }
    }
    // For system Node.js, use 'npm' command (will be resolved from PATH)
    return 'npm';
}
/**
 * Get npx executable path based on Node.js path
 *
 * @param nodePath Path to node.exe
 * @returns Absolute path to npx.cmd (or npx on Unix)
 */
function getNpxPath(nodePath) {
    const resolvedNodePath = nodePath || resolveNodePath();
    const nodeDir = path.dirname(resolvedNodePath);
    // For bundled Node.js, npx.cmd is in the same directory
    if (resolvedNodePath.includes('resources\\node')) {
        const npxCmd = path.join(nodeDir, 'npx.cmd');
        if (fs.existsSync(npxCmd)) {
            return npxCmd;
        }
    }
    // For system Node.js, use 'npx' command (will be resolved from PATH)
    return 'npx';
}
/**
 * Get bundled Node.js path (resources/node/node.exe)
 *
 * Checks both production (process.resourcesPath) and development (project root) locations.
 *
 * @returns Absolute path to bundled node.exe, or null if not found
 */
function getBundledNodePath() {
    // Production: Electron sets process.resourcesPath
    if (typeof process !== 'undefined' && process.resourcesPath) {
        const resourcesPath = process.resourcesPath;
        const bundledNode = path.join(resourcesPath, 'node', 'node.exe');
        if (fs.existsSync(bundledNode)) {
            return bundledNode;
        }
    }
    // Development: Check project root
    const projectRoot = getProjectRoot();
    const bundledNode = path.join(projectRoot, 'resources', 'node', 'node.exe');
    if (fs.existsSync(bundledNode)) {
        return bundledNode;
    }
    return null;
}
/**
 * Get system Node.js path from PATH environment variable
 *
 * Uses 'where node' command on Windows to locate node.exe
 *
 * @returns Absolute path to system node.exe, or null if not found
 */
function getSystemNodePath() {
    try {
        // Use 'where' command on Windows to find node.exe in PATH
        const output = (0, child_process_1.execSync)('where node', {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true,
        });
        // 'where' returns multiple lines if multiple matches exist
        // Take the first one
        const lines = output.trim().split('\n');
        const firstMatch = lines[0].trim();
        if (fs.existsSync(firstMatch)) {
            return firstMatch;
        }
    }
    catch (error) {
        // 'where' command failed (Node.js not in PATH)
        return null;
    }
    return null;
}
/**
 * Get project root directory
 *
 * Walks up from current directory until package.json is found
 *
 * @returns Absolute path to project root
 */
function getProjectRoot() {
    let currentDir = __dirname;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;
    while (depth < maxDepth) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached file system root
            break;
        }
        currentDir = parentDir;
        depth++;
    }
    // Fallback: assume current working directory
    return process.cwd();
}
/**
 * Clear cached paths (for testing purposes)
 */
function clearCache() {
    cachedNodePath = null;
    cachedRuntimeInfo = null;
}
