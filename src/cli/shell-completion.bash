#!/bin/bash

completions() {
	local current_word="${COMP_WORDS[COMP_CWORD]}"

	options="$(medic-conf-shell-completion $COMP_CWORD $current_word)"

	# Tell complete what stuff to show.
	COMPREPLY=($(compgen -o dirnames -W "$options" -- "$current_word"))
}

complete -o dirnames -F completions medic-conf
