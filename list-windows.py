#!/usr/bin/python -u

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
        res.append(windowId + "," + str(x) + "," + str(y) + "," + str(w) + "," + str(h))
    return '#'.join(res)

def getWindowInfo(windowID):
    #49885
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

# Read a message from stdin and decode it.
def get_message():
    raw_length = sys.stdin.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.read(message_length)
    return json.loads(message)

# Encode a message for transmission, given its content.
def encode_message(message_content):
    encoded_content = json.dumps(message_content)
    encoded_length = struct.pack('=I', len(encoded_content))
    return {'length': encoded_length, 'content': encoded_content}

# Send an encoded message to stdout.
def send_message(encoded_message):
    sys.stdout.write(encoded_message['length'])
    sys.stdout.write(encoded_message['content'])
    sys.stdout.flush()

#test()
#print(getWindowInfo('49180'))
while True:
    message = get_message()
    #send_message(encode_message("pong"))
    #if message == "ping":
    #    send_message(encode_message("pong"))
    #if message == "windowposition":
    #    send_message(encode_message(getWindowInfo()))
    if message == "all":
        send_message(encode_message(getWindowInfos()))
    else:
        send_message(encode_message(getWindowInfo(message)))
