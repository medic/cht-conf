#!/bin/bash

completions() {
	local current_word="${COMP_WORDS[COMP_CWORD]}"

	options="$(shell-completion-for-medic-conf $COMP_CWORD $current_word)"

	# Tell complete what stuff to show.
	COMPREPLY=($(compgen -o dirnames -W "$options" -- "$current_word"))
}

complete -o dirnames -F completions medic-conf
