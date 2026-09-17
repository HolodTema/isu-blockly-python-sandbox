interface HeaderButtonProps {
    img: string
    text?: string
    onClick: () => void
}

function HeaderButton({ img, text, onClick }: HeaderButtonProps) {
  return (
    <button className="header-button" onClick={onClick}>
      <img src={img} alt="" />
      <span>{text}</span>
    </button>
  );
}
export { HeaderButton };