pragma solidity ^0.5.0;

contract DebugEvents {
    event DebugUint(string msg, uint value);
    event DebugString(string msg, string value);
    event DebugAddress(string msg, address value);
    event DebugBool(string msg, bool value);
}