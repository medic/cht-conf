#!/bin/bash

completions() {
	local cur
	_get_comp_words_by_ref -n : cur

	options="$(shell-completion-for-medic-conf $COMP_CWORD $cur)"

	# Tell complete what stuff to show.
	COMPREPLY=($(compgen -o dirnames -W "$options" -- "$cur"))

	__ltrim_colon_completions "$cur"
}

complete -o dirnames -F completions medic-conf
