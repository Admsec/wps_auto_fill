const cron = require('node-cron');
const myHeaders = new Headers();
myHeaders.append(
  "Cookie",
  "你的cookie，不用的话可为空"
);
myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0");
myHeaders.append("Accept", "*/*");
myHeaders.append("Host", "f-api.wps.cn");
myHeaders.append("origin", "https://f.wps.cn");
// 整死我了，这里的 content-type 要改成 Content-Type
myHeaders.append("Content-Type", "application/json; charset=utf-8");
myHeaders.append("priority", "u=1, i");
myHeaders.append("referer", "https://f.wps.cn/");
myHeaders.append('sec-ch-ua', '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"')
myHeaders.append('sec-ch-ua-mobile', '?0')
myHeaders.append('sec-ch-ua-platform', 'Windows')
myHeaders.append('sec-fetch-dest', 'empty')
myHeaders.append('sec-fetch-mode', 'cors')
myHeaders.append('sec-fetch-site', 'same-site')

// config 的 key 要对照 wps表上的问题；
const config = {
  '姓名': '',
  '性别': '男',
  '学院': '',
  '学号': "",
  '你的出生日期是？': new Date('1970-1-1').getTime(),
  '选择志愿岗位（注意好自己的性别，没了就不要填了，计时录像志愿者无性别要求）': "普通志愿者（男）",
  '手机号': "",
  '选择报名的岗位': '普通志愿者（男）',
  // url 最后的一个 / 后面的字符串
  'wps_id' : ''
}

const requestOptions = {
  method: "GET",
  headers: myHeaders,
};
async function getData() {
  const response = await fetch(`https://f-api.wps.cn/ksform/api/v3/campaign/${config['wps_id']}`, requestOptions);
  const json = await response.json();
  const token = json['data']['token'];
  const editVersion = json['data']['editVersion'];
  const preData = json['data']['questionMap'];
  
  const data = {
    // "phoneNumber": "",
    "editVersion": editVersion,
    "token": token,
    "_t": new Date().getTime(),
    "answerJson": {
      "answersProperty":{'presetKeyId': '', 'presetKeyValue': '', 'commitInfo': {'optionText': ''}},
      "answers": {},
      "consumeTime": Math.floor(Math.random(0, 9) * 100)
    }
    
  };
  
  const keys = Object.keys(preData);
  
  for (const key of keys) {
    let answer = {}; // 创建答案对象

    if (preData[key]['type'] === 'input') {
      answer = {
        'type': 'input',
        'strValue': config[preData[key]['title']]
      };
    } else if (preData[key]['type'] === 'date') {
      answer = {
        'type': 'date',
        'dateValue': {
          "format": "YYYY-MM-DD",
          "unit": "",
          "value": config[preData[key]['title']]
        }
      };
    } else if (preData[key]['type'] === 'select') {
      const selectInfo = preData[key]['selectInfo']['selects'].find(arr => arr['val'] === config[preData[key]['title']]);
      if (selectInfo) {
        const value = [{
          "val": config[preData[key]['title']],
          "selectId": selectInfo['selectId']
        }]
        answer = {
          'type': 'select',
          "selectValue": value
        };
      } else {
        // 处理未找到匹配项的逻辑（可选）
        console.warn(`未找到选择项: ${preData[key]['title']}`);
      }
    } else if (preData[key]['type'] === 'telphone') {
      answer = {
        'type': 'telphone',
        'strValue': config[preData[key]['title']]
      };
    }
    // console.log(JSON.stringify(data));
    
    data['answerJson']['answers'][key] = answer; // 添加答案对象到data
  }

  // console.log(JSON.stringify(data));
  
  return data
}

async function submit() {
  const data = await getData()
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify(data)
  };
  await fetch(`https://f-api.wps.cn/ksform/api/v3/campaign/${config['wps_id']}`, requestOptions)
  // console.log(await response.json());
  const requestOption = {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      'desc': true,
      'limit': 1,
      'start': 0
    })
  };
  const response = await fetch(`https://f-api.wps.cn/ksform/api/v3/campaign/${config['wps_id']}/answers/list`, requestOption)

  console.log('提交成功, 提交记录：');
  const pre_result = await response.json()
  const result = pre_result['data']['answers']?.[0]?.['answerJson']?.['answers']
  console.log(result == undefined ? '记录查询失败，也许是还没有开始？' : result);
  return result != undefined
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('定时任务开启，任务将在 11:59:58 执行');
cron.schedule('58 59 11 * * *', async () => {
  // 在这里执行你需要的代码
  // 成功 : true, 失败 false
  let flag = false;
  let num = 0
  while(!flag){
    console.log(`第${num}次执行`);
    const result = await submit();
    flag = result == undefined ? false : true
    await sleep(200)
  }
});


(async () => {
  let flag = false;
  let num = 0
  while(!flag){
    console.log(`第${num}次执行`);
    const result = await submit();
    flag = result == undefined ? false : true
    await sleep(200)
  }
})()