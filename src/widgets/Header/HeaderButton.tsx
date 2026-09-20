/**
 * Small reusable button for header bar.
 *
 * Renders icon, optional label and optional keyboard shortcut hint. Used both
 * in main header row and inside dropdown menu — layout adjusts via parent
 * container class, so this component does not care where it is placed.
 */
interface HeaderButtonProps {
    img: string
    text?: string
    shortcut?: string
    onClick: () => void
}

/**
 * @example
 * ```tsx
 * <HeaderButton img={icRunCode} text="Запуск" onClick={onRunCode} />
 * ```
 */
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
