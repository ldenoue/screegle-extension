#!/usr/bin/env python

from curses import getwin
import json
import sys
import struct

import Quartz
import time
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListExcludeDesktopElements, kCGNullWindowID
from Foundation import NSSet, NSMutableSet

def windowList(wl):
    for v in wl:
        print ( 
        str(v.valueForKey_('kCGWindowOwnerPID') or '?').rjust(7) + 
            ' ' + str(v.valueForKey_('kCGWindowNumber') or '?').rjust(5) + 
            ' {' + ('' if v.valueForKey_('kCGWindowBounds') is None else ( 
                    str(int(v.valueForKey_('kCGWindowBounds').valueForKey_('X')))     + ',' + 
                    str(int(v.valueForKey_('kCGWindowBounds').valueForKey_('Y')))     + ',' + 
                    str(int(v.valueForKey_('kCGWindowBounds').valueForKey_('Width'))) + ',' + 
                    str(int(v.valueForKey_('kCGWindowBounds').valueForKey_('Height'))) 
                ) ).ljust(21) + '}' + 
            '\t[' + ((v.valueForKey_('kCGWindowOwnerName') or '') + ']') + 
            ('' if v.valueForKey_('kCGWindowName') is None else (' ' + 
            v.valueForKey_('kCGWindowName') or '')) 
        ).encode('utf8') # remove 'encode' for Python 3.x

def getWindowInfos():
    wl = CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID)
    res = []
    # CGWindowListCopyWindowInfo returns windows in order top to below
    for v in wl:
        windowId = str(v.valueForKey_('kCGWindowNumber'))
        x = int(v.valueForKey_('kCGWindowBounds').valueForKey_('X'))
        y = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Y'))
        w = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Width'))
        h = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Height'))
        #z = int(v.valueForKey_('kCGWindowLayer'))
        #name = str(v.valueForKey_('kCGWindowOwnerName'))
        #res.append(windowId + "," + str(x) + "," + str(y) + "," + str(w) + "," + str(h) + "," + str(z) + "," + str(name))
        if w > 24 and h > 24:
            res.append(windowId + "," + str(x) + "," + str(y) + "," + str(w) + "," + str(h))
    return '#'.join(res)

def getWindowInfo(windowID):
    wl = CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID)
    for v in wl:
        windowNumber = str(v.valueForKey_('kCGWindowNumber'))
        windowName = v.valueForKey_('kCGWindowName')
        #print(windowNumber,windowName)
        if str(windowNumber) == windowID:
            x = int(v.valueForKey_('kCGWindowBounds').valueForKey_('X'))
            y = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Y'))
            w = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Width'))
            h = int(v.valueForKey_('kCGWindowBounds').valueForKey_('Height'))
            result = windowID + "," + str(x) + "," + str(y) + "," + str(w) + "," + str(h)
            return result
    return "error"

def test():
    wl1 = CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID)
    print('Move target window (or ignore)',len(wl1),'\n')
    time.sleep(2)

    #print('PID'.rjust(7) + ' ' + 'WinID'.rjust(5) + '  ' + 'x,y,w,h'.ljust(21) + ' ' + '\t[Title] SubTitle')
    #print('-'.rjust(7,'-') + ' ' + '-'.rjust(5,'-') + '  ' + '-'.ljust(21,'-') + ' ' + '\t-------------------------------------------')

    wl2 = CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID)

    print(len(wl2))
    w = NSMutableSet.setWithArray_(wl1)
    w.minusSet_(NSSet.setWithArray_(wl2))

    wl = Quartz.CGWindowListCopyWindowInfo( Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID)
    wl = sorted(wl, key=lambda k: k.valueForKey_('kCGWindowLayer'))
    print(wl)
    #windowList(wl)

    print('\nDetailed window information: {0}\n'.format(w))

#print(getWindowInfo('49180'))
try:
    # Python 3.x version
    # Read a message from stdin and decode it.
    def getMessage():
        rawLength = sys.stdin.buffer.read(4)
        if len(rawLength) == 0:
            sys.exit(0)
        messageLength = struct.unpack('@I', rawLength)[0]
        message = sys.stdin.buffer.read(messageLength).decode('utf-8')
        return json.loads(message)

    # Encode a message for transmission,
    # given its content.
    def encodeMessage(messageContent):
        encodedContent = json.dumps(messageContent).encode('utf-8')
        encodedLength = struct.pack('@I', len(encodedContent))
        return {'length': encodedLength, 'content': encodedContent}

    # Send an encoded message to stdout
    def sendMessage(encodedMessage):
        sys.stdout.buffer.write(encodedMessage['length'])
        sys.stdout.buffer.write(encodedMessage['content'])
        sys.stdout.buffer.flush()

    while True:
        receivedMessage = getMessage()
        if receivedMessage == "ping":
            sendMessage(encodeMessage("pong3"))
except AttributeError:
    # Python 2.x version (if sys.stdin.buffer is not defined)
    # Read a message from stdin and decode it.
    def getMessage():
        rawLength = sys.stdin.read(4)
        if len(rawLength) == 0:
            sys.exit(0)
        messageLength = struct.unpack('@I', rawLength)[0]
        message = sys.stdin.read(messageLength)
        return json.loads(message)

    # Encode a message for transmission,
    # given its content.
    def encodeMessage(messageContent):
        encodedContent = json.dumps(messageContent)
        encodedLength = struct.pack('@I', len(encodedContent))
        return {'length': encodedLength, 'content': encodedContent}

    # Send an encoded message to stdout
    def sendMessage(encodedMessage):
        sys.stdout.write(encodedMessage['length'])
        sys.stdout.write(encodedMessage['content'])
        sys.stdout.flush()

    while True:
        receivedMessage = getMessage()
        if receivedMessage == "all":
            sendMessage(encodeMessage(getWindowInfos()))
