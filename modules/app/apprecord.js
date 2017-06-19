/**
 * @version v0.0.1
 * @author wzh
 * @description 用于保存app的用户访问记录
 */

/**
 * 首先明确需要收集的信息有以下三块
 * 1. 用户的课程访问记录
 * 2. 用户的新闻访问记录
 * 3. 用户的学习记录
 * 在进入app之前会经过启动页面，在启动页面进行上次未发送数据的发送和本次数据的初始化
 * 定时发送数据机制，由于无法判断到底有多少个脚本在同时运行相同程序，准备在新页面打开时触发数据发送机制
 * 如果达不到发送条件，进行下次循环。
 * 课程点击和新闻浏览的数据记录最好的方式是在详情页监听被点击事件
 * 学习页面的记录同样通过监听被点击事件来记录数据。
 * 此处只负责用于发送本地记录。
 */

/**
 * @description 数据格式描述
 * {
  "token": "sample string 1",使用imei号码作为唯一指定token
  "basetime": 2,当前记录的开始时间，直接取本地时间
  "userid": 3,//取出本地存储的用户id
  "sendTime: 12456"可以发送数据的时间点。
  "dataList": [
    {
      "key": "sample string 1", md5算法加密url和当前id
      "url": "sample string 2",当前页面url,需要加上页面参数
      "starttime": 3,开始时间，本地时间
      "staylength": 4,该页面的停留时间
      "courseid": 5,课程id
      "sortid": 6,课件id
      "studylong": 7  视屏播放存在时间
    },
  ]
}
 */

/**
 * configure{
 *    sendTime://间隔发送的时间
 *    url:数据发送接口
 *    Name:本地存储键名
 * }
 */

class sendRecord {
    constructor(configure) {
        this.configure = configure;
    }

    /**
   * 开始发送本地存储的数据
   * @type {function}
   */
    startSend(configure = this.configure) {
        let name = configure.Name,
            self = this,
            data = self.getData(name),
            sendTime = configure.sendTime,
            flag = self.timeCompare(data);
        if (flag) {
            slef.sendData(data);
            data.canSendTime = new Date().getTime() + sendTime;
            self.setData(data);
        }
        setTimeout(() => {
            self.startSend();
        }, sendTime);
    }

    /**
   * 进行时间的对比，判断是否需要发送数据
   * 如果当前时间大于可发送数据时间，说明当前可发送ajax数据
   * @type {function}
   */
    timeCompare(data) {
        let self = this,
            parentTime = new Date().getTime(),
            oldTime = data.canSendTime;
        if (parentTime > oldTime) {
            return true;
        } else {
            return false;
        }
    }

    /**
 * 发送数据，同时要进行数据的格式化操作。
 * @type {function}
 */
    sendData(data, configure = this.configure) {
        /**
     * 首先进行数据的格式化
     * 去掉不需要的数据
     */
        let ajaxData = {
            token: data.token,
            basetime: data.basetime,
            usertoken: data.usertoken,
            devicecode:data.devicecode,
            dataList: data.dataList
        };
        let url = configure.url;
        mui.ajax(url, {
            data: ajaxData,
            dataType: 'json',
            type: 'post',
            timeout: 5000,
            success: function() {
                console.log("数据发送成功");
            },
            error: function(xhr, type, errorThrown) {
                console.log(type);
            }
        });
    }

    /**
 * 从本地存储获取数据，
 * @type {function}
 */
    getData(name) {
        let data = localStorage.getItem(name);
        return JSON.parse(data);
    }

    /**
 * 数据存储。
 * @type {function}
 */
    setData(data, configure = this.configure) {
        let name = configure.Name;
        data = JSON.stringify(data);
        localStorage.setItem(name, data);
    }
}
new sendRecord({
  sendTime:3e4,
  url:"http://192.168.1.112:8888/Help/Api/POST-api-VisitRecord-MobleRoutineRecord",
  Name:"Name"
}).startSend();
