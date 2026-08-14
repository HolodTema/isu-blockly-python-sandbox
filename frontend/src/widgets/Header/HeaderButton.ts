import HButton from "../../shared/types";

function HeaderButton({ img, text, onClick }: HButton) {
  return (
    <button className="header-button" onClick={onClick}>
      <img src={img} alt="" />
      <span>{text}</span>
    </button>
  );
}