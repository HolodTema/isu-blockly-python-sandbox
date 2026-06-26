export default function configureCodeOutputExpandButton() {
    const buttonOutputExpand = document.getElementById("button_expand_output")

    const codeOutput = document.getElementById("code_output");

    buttonOutputExpand.addEventListener("click", function () {
        if (codeOutput.className === "font_powered_cascadia_code code_output_expanded") {
            codeOutput.className = "font_powered_cascadia_code code_output_not_expanded";
            buttonOutputExpand.src = "assets/images/ic_expand_up.svg";
        } else {
            codeOutput.className = "font_powered_cascadia_code code_output_expanded";
            buttonOutputExpand.src = "assets/images/ic_expand_down.svg";
        }
    })
}

