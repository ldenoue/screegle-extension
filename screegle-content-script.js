/*function sendMessage(info,cb)
{
  try {
    chrome.runtime.sendMessage(info, function response(res) {
      if (res && cb)
        cb(res);
    });
  } catch(e)
  {
    if (cb)
      cb({error:e});
    else
      console.error('sendMessage error' + e);
  }
}

sendMessage({windowId:200}, res => { console.log('res=',res)})
*/