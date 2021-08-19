/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYS ASSET SERVER MIDDLEWARE

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

///	LOAD LIBRARIES ////////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const Path = require('path');
const FILE = require('./util/files');
const HTTP = require('./util/http-proxy');
const PROMPTS = require('./util/prompts');
const {
  GS_MANIFEST_FILENAME,
  GS_ASSET_HOST_URL,
  GS_ASSETS_PATH
} = require('../../../gsgo-settings');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const TERM = PROMPTS.makeTerminalOut('ASSETS', 'TagGreen');
const ASSET_ID_START = 100;

/// SUPPORT METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ScanAssets(dirpath) {
  const subdir = dirpath.substring(dirpath.lastIndexOf('/') + 1);
  // get valid media files
  const mediafiles = FILE.GetFiles(dirpath).filter(f =>
    FILE.HasValidAssetExtension({ type: subdir, filename: f })
  );
  TERM(`... ${subdir} has ${mediafiles.length} valid files`);

  const jsonfiles = mediafiles.filter(
    f => Path.extname(f).toLowerCase() === '.json'
  );
  TERM(`... ${subdir} has ${jsonfiles.length} json files to scan for images`);

  const spriteFiles = [];
  jsonfiles.forEach(f => {
    const file = FILE.ReadJSON(`${dirpath}/${f}`);
    const { meta, frames } = file;
    if (meta && meta.image) spriteFiles.push(meta.image);
    if (frames && Array.isArray(frames))
      for (let frame of frames)
        if (frame.filename) spriteFiles.push(frame.filenam);
  });
  TERM(`... jsonfiles contained ${spriteFiles.length} image references`);
  return { mediafiles, jsonfiles, spriteFiles };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_PromiseHashes(dirpath, files) {
  const promises = [];
  for (const f of files) {
    const p = Path.join(dirpath, f);
    promises.push(FILE.PromiseFileHash(p));
  }
  return promises;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetManifestDataArray(dirpath) {
  const allfiles = FILE.GetFiles(dirpath);
  const manifests = allfiles
    .filter(f => f.startsWith(GS_MANIFEST_FILENAME) && f.endsWith('.json'))
    .sort();

  // CASE 1: 1 OR MORE MANIFEST FILES
  if (manifests.length > 0) {
    TERM('.. manifest files:', manifests);
    const m = [];
    for (let f of manifests) {
      const json = FILE.ReadJSON(`${dirpath}/${f}`);
      m.push(json);
    }
    return m;
  }
  return [];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DecodeAssetRequest(req) {
  const reqbits = HTTP.DecodeRequest('assets', req);
  // TERM(JSON.stringify(reqbits, null, 2));
  return reqbits;
}

/// MIDDLEWARE DEFINITION /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AssetManifest_Middleware(options = {}) {
  const {
    assetPath = GS_ASSETS_PATH,
    remoteAssetUrl = GS_ASSET_HOST_URL
  } = options;
  return async (req, res, next) => {
    // (0) define output object to capture data
    const manifest = {};
    const { pathname, searchParams } = m_DecodeAssetRequest(req);
    // (2) if has ?manifest query, do special processing
    if (!searchParams.has('manifest')) {
      next(); // no manifest request, so let next middleware
    } else {
      TERM(`requested manifest for: '${pathname}'`);
      const dirpath = Path.join(assetPath, pathname);

      if (!FILE.IsDirectory(dirpath)) {
        TERM(`manifest error: '${dirpath}' is not a directory`);
        next();
        return;
      }

      const mdata = m_GetManifestDataArray(dirpath);
      if (mdata.length > 0) {
        res.json(mdata);
        return;
      }

      // CASE 2: NO MANIFEST FILE, SO SCAN SUBDIRS
      let assetcounter = ASSET_ID_START;
      const assetdirs = FILE.GetAssetDirs(dirpath);
      TERM(`... found ${assetdirs.length} assetdirs`);

      for (const subdir of assetdirs) {
        const subdirpath = Path.join(dirpath, subdir);
        // get valid media files & jsonfiles subsets
        const { mediafiles, jsonfiles, spriteFiles } = m_ScanAssets(subdirpath);
        // only load hard png assets
        const files = mediafiles.filter(f => !spriteFiles.includes(f));
        const promises = m_PromiseHashes(subdirpath, files);
        //
        //
        // eslint-disable-next-line no-await-in-loop
        const filesInfo = await Promise.all(promises);
        //
        //
        //
        const entries = [];
        for (let info of filesInfo) {
          const assetId = assetcounter++;
          const { filename, ext: assetType, hash } = info;
          const asset = {
            assetId,
            assetName: filename,
            assetUrl: `${subdir}/${filename}`,
            assetType,
            hash
          };
          entries.push(asset);
        }
        manifest[subdir] = entries;
      } // end subdir processing
      res.json(manifest);
    }
  };
}

/// MIDDLEWARE DEFINITION /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function MediaProxy_Middleware(options = {}) {
  const { remoteAssetUrl, assetPath = GS_ASSETS_PATH } = options;
  if (remoteAssetUrl === undefined) {
    TERM('NO MEDIAHOST DEFINED: proxied media is disabled');
    return (req, res, next) => next();
  }
  return (req, res, next) => {
    HTTP.ProxyMedia(req, res, next);
  };
}

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = { AssetManifest_Middleware, MediaProxy_Middleware };
