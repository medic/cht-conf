#compdef cht

_cht() {
    local curcontext="$curcontext" state line
    typeset -A opt_args
    
    # Get the current word being completed
    local current_word="${words[CURRENT]}"
    local current_pos=$CURRENT
    
    # Call the shell-completion-for-cht program to get available options
    # current_pos - 1 gives the index of the previous word, which is typically the argument it is the word just before the current word
    # previous_word helps in setting correct context for the completion
    
    local completion_options
    completion_options=$(shell-completion-for-cht $((current_pos-1)) "$current_word")
    
    # Split the output by spaces into an array
    local -a completion_array
    completion_array=(${=completion_options})
    
    # Provide completions
    compadd -a completion_array
}
    #Register the completion function
    compdef _cht cht