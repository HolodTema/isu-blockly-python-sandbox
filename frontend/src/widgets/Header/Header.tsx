import HeaderButton from './Hbuttons'
export function Header() {

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <img></img>
            <HeaderButton></HeaderButton>
            <HeaderButton></HeaderButton>
         </div>
         <div className = 'header_container__right'>
            <HeaderButton></HeaderButton>
            <HeaderButton></HeaderButton>
         </div>
    </div>

    );
}