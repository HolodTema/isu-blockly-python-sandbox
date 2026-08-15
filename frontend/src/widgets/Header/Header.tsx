import { HeaderButton } from './HeaderButton'
export function Header() {

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <img></img>
            <HeaderButton img="" text="" onClick={() => {}}></HeaderButton>
            <HeaderButton img="" text="" onClick={() => {}}></HeaderButton>
         </div>
         <div className = 'header_container__right'>
            <HeaderButton img="" text="" onClick={() => {}}></HeaderButton>
            <HeaderButton img="" text="" onClick={() => {}}></HeaderButton>
         </div>
    </div>

    );
}