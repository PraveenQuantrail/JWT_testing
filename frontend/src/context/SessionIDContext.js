import { createContext, useEffect, useState } from "react";

export const SessionIDContext = createContext();

export default function SessionIDProvider({ children }) {

    const [SessionID, setSessionID] = useState([]);
    const TokenKey = process.env.REACT_APP_SESSIONID_KEY;


    function CheckingSessionID() {
        const CurrentToken = JSON.parse(localStorage.getItem(TokenKey)) || []
        for (const session of CurrentToken) {
            const currentdate = new Date();
            if (currentdate > new Date(session.expires_at) || currentdate === new Date(session.expires_at)) {
                const filterSession = CurrentToken.filter((ses) => ses.dbid !== session.dbid);
                localStorage.setItem(TokenKey, JSON.stringify(filterSession));
                setSessionID(filterSession);
            }
        }

    }

    function RemoveSessionId(dbid) {
        const filterData = JSON.parse(localStorage.getItem(TokenKey)).filter((val) => val.dbid !== dbid);
        localStorage.setItem(TokenKey,JSON.stringify(filterData));
        setSessionID(filterData);
    }

    function InitGetSessionIds() {
        setSessionID(JSON.parse(localStorage.getItem(TokenKey)));
    }

    function checkCurrentSessionId(dbid) {
        const SessionIDData = JSON.parse(localStorage.getItem(TokenKey)) || [];
        if (SessionIDData.length > 0) {
            const find = SessionIDData.find(token => token.dbid === dbid);
            if (find) {
                const currentDateTime = new Date();
                return currentDateTime < new Date(find.expires_at) ? true : false;
            }else {
                return false;
            }
        }else {
            return false;
        }
    } 

    function GetSessionID(dbid) {
        const SessionData = JSON.parse(localStorage.getItem(TokenKey)) || [];
        const filter = SessionData.filter((token) => token.dbid === dbid);
        if (filter.length > 0) {
            return filter[0].token;
        }
        return null;
    }


    async function InsertSessionStorage(connectFastAPI) {
        const fastAPISessions = JSON.parse(localStorage.getItem(TokenKey)) || [];
        if (fastAPISessions.length > 0) {
            const findID = fastAPISessions.filter((val) => val.dbid === connectFastAPI.dbID);

            if (findID.length > 0) {
                const sessiondata = fastAPISessions.map((val) => {
                    if (val.dbid === connectFastAPI.dbID) {
                        return { ...val, token: connectFastAPI.sessionID, expires_at: connectFastAPI.expires_at }
                    }
                    return val
                })
                localStorage.setItem(TokenKey, JSON.stringify(sessiondata));
                setSessionID(sessiondata);
            } else {
                let sessiondata = [...fastAPISessions, { dbid: connectFastAPI.dbID, token: connectFastAPI.sessionID, expires_at: connectFastAPI.expires_at }]
                localStorage.setItem(TokenKey, JSON.stringify(sessiondata));
                setSessionID(sessiondata);
            }
        } else {
            let sessiondata = [{ dbid: connectFastAPI.dbID, token: connectFastAPI.sessionID, expires_at: connectFastAPI.expires_at }]
            localStorage.setItem(TokenKey, JSON.stringify(sessiondata));
            setSessionID(sessiondata)
        }
    }


    useEffect(() => {
        InitGetSessionIds() // init method to get all token to state
        setInterval(() => {
            CheckingSessionID();
        }, 1);

    }, [])

    return (
        <SessionIDContext.Provider value={{ sessionIDData: SessionID,GetSessionID,checkCurrentSessionId,InsertSessionStorage:InsertSessionStorage,RemoveSessionId:RemoveSessionId }}>
            {children}
        </SessionIDContext.Provider>
    )
}