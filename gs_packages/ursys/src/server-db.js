/* eslint-disable max-classes-per-file */
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYS System Database Services
  For outward-facing database operations

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const fse = require('fs-extra');
const path = require('path');
const { graphqlHTTP } = require('express-graphql');
const { graphql, buildSchema } = require('graphql');
const LOKI = require('lokijs');
const TERM = require('./util/prompts').makeTerminalOut('  URDB', 'TagRed');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let DB;
let SCHEMA;
let ROOT;

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetGraphQL_Middleware(opt) {
  TERM('Initialize called with', JSON.stringify(opt));
  const { dbPath, importPath } = opt;

  // if dbPath is a string, then use it to initialize a Loki instance
  // with autosaving enabled
  if (typeof dbPath === 'string' && dbPath.length > 0) {
    TERM('loading', dbPath);
    fse.ensureDirSync(path.dirname(dbPath));
    DB = new LOKI(dbPath, { autosave: true, autoload: true });
    DB.saveDatabase(err => {
      if (err) TERM(err);
      else TERM('saved');
    });
  }

  // if importPath provided, load it and then clear the existing db,
  // then import the new data by inserting it document by document
  // back into the database so it is fresh on every run (this is
  // for debugging purposes)
  if (typeof importPath === 'string' && importPath.length > 0) {
    const data = fse.readJsonSync(importPath);
    const { locales } = data;
    if (Array.isArray(locales)) {
      TERM(`importing ${locales.length} locale(s)`);
      if (DB.getCollection('locales')) {
        TERM('deleting old locales from db');
        DB.removeCollection('locales');
      }
      const col = DB.addCollection('locales');
      locales.forEach(locale => {
        TERM(`writing '${locale.locale}'`);
        col.insert(locale);
      });
    }
    // import code goes here
  } else {
    // if we got here, then there was no valid importPath specified
    // and the db can't be iniitalized!
    TERM('no importPath provided in options object');
  }

  // create graphql schema
  TERM('specifying schema....');
  SCHEMA = buildSchema(`
  type Query {
    locale (name:String): LocaleData
    locales: [String!]
  }

  type LocaleData {
    ptrack: PTrackData
  }

  type PTrackData {
    memo: String
    width: Float
    depth: Float
    offx: Float
    offy: Float
    xscale: Float
    yscale: Float
    xrot: Float
    yrot: Float
    zrot: Float
  }

  `);

  // create graphql root map
  // for LOKI JS query examples: echfort.github.io/LokiJS/tutorial-Query%20Examples.html
  TERM('creating graphql root map');
  ROOT = {
    locale: args => {
      const { name } = args;
      const coll = DB.getCollection('locales');
      const result = coll.findOne({ locale: name });
      TERM(`looking for '${name}', found ${JSON.stringify(result)}`);

      return result;
    },
    locales: () => {
      const coll = DB.getCollection('locales');
      const locales = coll
        .chain() // return full ResultSet
        .data({ removeMeta: true }) // return documents in ResultSet as Array
        .map(i => i.locale); // map documents to values
      return locales;
    }
  };

  // hook up graphql
  TERM('enabling graphql endpoint');
  return graphqlHTTP({
    schema: SCHEMA,
    rootValue: ROOT,
    graphiql: true
  });
}

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {
  GetGraphQL_Middleware
};
