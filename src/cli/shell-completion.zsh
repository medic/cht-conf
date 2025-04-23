#compdef cht

_cht() {
    local curcontext="$curcontext" state line
    typeset -A opt_args
    
    # Get the current word being completed
    local current_word="${words[CURRENT]}"
    local current_pos=$CURRENT
    
    # Call the shell-completion-for-cht program with appropriate arguments
    local completion_options
    completion_options=$(shell-completion-for-cht $((current_pos-1)) "$current_word")
    
    # Convert the output into an array
    local -a completion_array
    completion_array=(${(f)completion_options})
    
    # Provide the completions
    _describe 'commands' completion_array
}

# Register the completion function
compdef _cht cht