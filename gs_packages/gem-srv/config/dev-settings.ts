/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  internal development settings - can be freely imported anywhere

  DO NOT EDIT THIS FILE without telling SRI!!!

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// DEV CODE VERIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const VER_DEV_WIZ = '0101DW';
export const VER_DEV_CODETEST = '0100CT';

/// GLOBAL DEBUG SWITCHES /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const DEBUG_FLAGS = {
  SYMBOLIZE_CALLS: false // print traces for when symbolize+compile occurs
};

/// SCRIPT TO LINES ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** whether to draw all blank lines or not in GUI (closing brackets become
 *  blank lines, so NOT drawing them looks better. Note that BLANK LINES
 *  in scriptText are handled separately */
export const SHOW_EMPTY_STATEMENTS = true;
/** whether to index the first entry as 0 or 1 in the GUI */
export const SCRIPT_PAGE_INDEX_OFFSET = 1; // set to 1 for no 0 indexes

/// GUI WIZARD TEST BLUEPRINT /////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** when set to true, GUI WIZARD will load the test script defined in
 *  test-blueprint instead of the DEV_PRJID and BPID */
export const ENABLE_SYMBOL_TEST_BLUEPRINT = true;

/// ID COUNTER MIN/MAX VALUES /////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const INSTANCEDEF_ID_START = 9000; // instance definitions < 9000 are special?