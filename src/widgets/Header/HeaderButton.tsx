interface HeaderButtonProps {
    img: string
    text?: string
    shortcut?: string
    onClick: () => void
}

function HeaderButton({ img, text, shortcut, onClick }: HeaderButtonProps) {
  return (
    <button className="header-button" onClick={onClick}>
      <img src={img} alt="" />
      <span>{text}</span>
      {shortcut && <span className="header-button__shortcut">{shortcut}</span>}
    </button>
  );
}
export { HeaderButton };
