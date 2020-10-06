import React, {useEffect, useState} from "react";
import {filterDuplicateId, getCurrentTime, randomId} from "./utils";
// eslint-disable-next-line no-unused-vars
import adapter from 'webrtc-adapter';
import {ALL_USER_IN_ROOM} from "./config";

const myWebSocket = new WebSocket('wss://' + window.location.hostname + ':8443');
const storedUser = JSON.parse(localStorage.getItem("user"));
const user = storedUser?storedUser:{id:randomId()};
if(!storedUser) localStorage.setItem("user", JSON.stringify(user));

const roomId = "12345-6789-abcd-efgh";
const initRoom = {id:roomId, created:getCurrentTime(), owner: null, users:[]};
initRoom.users.push(user);

export default function Room(){
    const lsRoomUsers = JSON.parse(localStorage.getItem("roomUsers"));
    const [myRoomInfo, setMyRoomInfo] = useState(initRoom);
    const [videoRefs, setVideoRefs] = useState({});
    const [started, setStarted] = useState(false);
    const [roomUsers, setRoomUsers] = useState(initRoom.users);
    const [constraints, setConstraints] = useState({ video: true, audio: true });
    const [peerConnectionConfig, setPeerConnectionConfig] = useState({'iceServers': [ {'urls': 'stun:stun.stunprotocol.org:3478'}, {'urls': 'stun:stun.l.google.com:19302'}, ] });
    const [peerConnection, setPeerConnection] = useState(new RTCPeerConnection(peerConnectionConfig));
    const [userLastPing, setUserLastPing] = useState({});

    function ping() {
        myWebSocket.send(JSON.stringify({ to:ALL_USER_IN_ROOM, from:user, ping: user, at: getCurrentTime() }));
        setTimeout(ping, 3000);
    }

    myWebSocket.onopen=()=>{
        // newUser send join info
        myWebSocket.send(JSON.stringify({ to:ALL_USER_IN_ROOM, from:user, newUser: user, at: getCurrentTime() }));
        ping();
    };

    myWebSocket.onclose = function (e) {
        console.log("user left")
    }

    function errorHandler(e) {
        console.error(e)
    }

    myWebSocket.onmessage=({data})=>{
        let { to, from, at, newUser, roomInfo, reload, sdp, ice, ping } = JSON.parse(data);
        if( from.id === user.id )return ;//if the sender, skip

        //to all user in room
        if( to === ALL_USER_IN_ROOM ){
            //notify all user in Room there's update in roomInfo
            if(roomInfo)
            {
                let users = filterDuplicateId(roomInfo.users);
                setRoomUsers(users);
                setMyRoomInfo(roomInfo);
            }
            //notify the room owner there's newUser
            else if( newUser )
            {
                //only one user allow to reply
                let users = filterDuplicateId(roomUsers.concat(newUser));
                myRoomInfo.users = users;
                myWebSocket.send(JSON.stringify({ to:ALL_USER_IN_ROOM, from:user, roomInfo: myRoomInfo, at: getCurrentTime() }));
                setRoomUsers(users);
                setMyRoomInfo(myRoomInfo);
            }
            else if( ping )
            {
                userLastPing[ping.id] = at;
            }
            else if(sdp)
            {
                peerConnection.setRemoteDescription(new RTCSessionDescription(sdp)).then(function() {
                    if(sdp.type === 'offer') {
                        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
                    }
                }).catch(errorHandler);
            }
            else if(ice)
            {
                peerConnection.addIceCandidate(new RTCIceCandidate(ice)).catch(errorHandler);
            }
        }
        //to this user
        else if( to.id===user.id )
        {
        }
    }

    function mediaNotSupportOrAllowed(e){
        console.error(e);
    }

    function gotIceCandidate(event) {
        if(event.candidate != null) {
            myWebSocket.send(JSON.stringify({ to:ALL_USER_IN_ROOM, from:user, ice: event.candidate, at: getCurrentTime()}));
        }
    }

    function createdDescription(description) {
        peerConnection.setLocalDescription(description).then(function() {
            myWebSocket.send(JSON.stringify({ to:ALL_USER_IN_ROOM, from:user, sdp: peerConnection.localDescription, at: getCurrentTime() }));
        }).catch(mediaNotSupportOrAllowed);
    }

    function gotRemoteStream(event) {
        Object.keys(videoRefs).forEach(key=>{
            if(parseInt(key)===user.id)return ;
            videoRefs[key].srcObject = event.streams[0]
        });
    }

    function start(stream){
        const videoDom = videoRefs[user.id];
        videoDom.srcObject = stream;
        peerConnection.onicecandidate = gotIceCandidate;
        peerConnection.ontrack = gotRemoteStream;
        peerConnection.addStream(stream);
        peerConnection.createOffer().then(createdDescription).catch(mediaNotSupportOrAllowed);
    }

    useEffect(()=>{
        if(started)return ;
        if( typeof videoRefs[user.id] === "undefined" ) return;
        if(navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(constraints).then((stream)=>{
                start(stream);
                setStarted(true);
            }).catch(mediaNotSupportOrAllowed);
        } else {
            throw mediaNotSupportOrAllowed;
        }
    },[roomUsers]);

    return (<>
        {roomUsers.map(row=><div key={row.id}>
            <div style={{
                justifyContent:"center",
                display:"flex",
                float:"left",
                width:100,
                height:180,
                border: "1px dotted gray",
                flexWrap:"wrap"
            }}>
                <div style={{
                    width:100,
                    height:100,
                    zIndex:10,
                    overflow:"hidden",
                    display:"block"
                }}>
                    <video
                        autoPlay muted
                        style={{
                            zIndex:9,
                            height: "100%",
                            width: "100%",
                            objectFit:"cover",
                            objectPosition:"center"
                        }}
                        ref={(ref) => {
                            videoRefs[row.id] = ref;
                            setVideoRefs(videoRefs);
                        }}/>
                </div>
                <div style={{
                    display:"block"
                }}>
                    <h3 style={{fontSize:"1rem"}}>{row.id}</h3>
                </div>
            </div>
        </div>)}
    </>)
}
