define Contact {}

/**
 * This is an example file.  Not all required functions have actually been
 * defined.
 */
rule GenerateEvents {
  when {
    c: Contact
  }
  then {
    __include_inline__('rules.contact.nools.js');
  }
}
