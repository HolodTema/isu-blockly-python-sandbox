import { HeaderButton } from './HeaderButton'
import {useState} from 'react'

import './Header.css'

export function Header() {

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <HeaderButton img=".assets/logo.svg" text="" onClick={() => {}}></HeaderButton>
            <HeaderButton img=".assets/ic_save_project.svg" text="" onClick={() => {}}></HeaderButton>
            <HeaderButton img=".assets/ic_open_project.svg" text="" onClick={() => {}}></HeaderButton>
         </div>
         <div className = 'header_container__right'>
            <HeaderButton img=".assets/ic_convert_to_code.svg" text="" onClick={() => {}}></HeaderButton>
             <HeaderButton img=".assets/ic_run_code.svg" text="" onClick={() => {}}></HeaderButton>
            <HeaderButton img=".assets/ic_debug.svg" text="" onClick={() => {}}></HeaderButton>
           
         </div>
    </div>

    );
}