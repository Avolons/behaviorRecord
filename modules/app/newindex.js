/**
 * @author wzh
 * @version 0.1
 * @description 用户行为记录脚本
 */

/**
 * 用户行为脚本记录流程
 * 1.实例化脚本对象，判断当前页面记录类型
 *    1.初次打开，本地完全无记录
 *    2.非初次打开，本地存在记录
 *      1.该记录为特殊情况下的错误记录，无法使用
 *      2.该记录为有效记录
 * 2.判断是否存在相同页面
 *    1.存在相同页面
 *    2.不存在相同页面
 * 3.页面数据初始化
 * 4.开启数据保存和数据发送定时器。
 * 5.开启浏览器关闭监听事件
 */

/**
 * @description 用户行为记录总类
 * @class saveRecord
 * @constructor
 * @param {Object} configure 类初始化配置参数
 * @param {oObject} local 类初始化参数（服务器赋予）
 */
class saveRecord {
    constructor(configure, local) {
        /**
         * @description 类初始化配置参数
         * @type {Object}
         */
        this.configure = configure;
        /**
         * @description 类初始化参数（服务器赋予）
         * @type {Object}
         */
        this.local = local;
    }

        /**
         * 获得用户记录脚本实例对象
         * @param {Object} configure 本地配置
         * @param {Object} local 脚本初始化数据对象
         * @return {Object} 用户实例对象
         */
    init(local = this.local, configure = this.configure) {
        let self = this,
            data = self.getData(),
            time = local.basetimespan,
            baseToken= local.basetoken;

        configure.timeDiff = time - local.basetimespan;
        /**
         * 首先判断当前是否属于新的记录
         * 该处用以判断该记录是否是异常记录
         */
        if (data) {
            /**
             * 根据token来判断当前记录，token不一样，更换token，
             * 并且先要发送上一次的数据
             */
            if(baseToken != data.basetoken){
              /**
               * 此处发送数据
               */
              self.sendData(data);
              localStorage.clear();
              data = null;
            }
        }
        /**
         * 判断三种状态
         * 1. 既没有userid又没有本地数据，说明记录初次开始,且处于未登录状态
         * 2. 有userid没有本地数据，说明记录初次开始,且有登录状态
         * 3. 如果本地存储没有userid而且数据中包含uSerid，则将其替换过去
         */
        if (!data && !local.baseukey) {
            self.ver(local);
        } else if (!data && local.baseukey) {
            self.ver(local, local.baseukey);
        } else {
            self.ver(local, local.baseukey, data);
        }
    }

    /**
     * 验证用户类别，得出数据存储方式，判断页面类别
     * @param {Object} local 脚本初始化数据对象
     * @param {String} id 用户角色id
     * @param {Object} data 本地数据
     */
    ver(local, id = undefined, data = undefined) {
        let self = this;
        if (!data) {
            data = {
                basetoken: local.basetoken,
                baseukey: null,
                basetimekey: local.basetimekey,
                startTime: local.basetimespan,
                endTime: local.basetimespan,
                canSend: true,
                canSendTime: local.basetimespan,
                dataList: []
            };
        }
        if (id) {
            //添加了用户id
            data.baseukey = id;
        }
        //初始化时判断当前页面的正确key;
        this.getKey(data);
        this.setData(data);
        //开始执行定期保存和定期发送函数
        setTimeout(function() {
            self.needSend();
        }, self.configure.sendTime);
        this.saveData();
        //开始执行浏览器监听函数
        this.befClose();
    }

    /**
     * 是否可以向后台发送数据请求
     * @param {Object} configure 本地配置
     * @return {null} 没有返回值，无限自调用
     */
    needSend(configure = this.configure) {
        let self = this,
            data = self.getData(),
            time = configure.sendTime,
            key = configure.key;
        const flag = self.timeCompare(data, configure);
        if (flag) {
            self.sendData(data);
            data.canSendTime = new Date().getTime() - configure.timeDiff;
            data.canSend = false;
            this.setData(data);
        }
        /**
         * 初始化时不执行，延时执行。
         */
        setTimeout(() => {
            self.needSend();
        }, time);
    }

    /**
     * 时间误差在允许范围之类，则可以发送数据对象
     * @param {Object} data 本地存储对象
     * @param {Object} configure 本地配置
     * @return {Boolean} 返回是否可以发送数据
     */
    timeCompare(data, configure) {
        /**
         * @type {Number} interval 发送的时间间隔
         * @type {Number} standard 应该可以发送的事件
         * @type {Number} timeDiff 本地时间和后台时间的事件差
         * @type {Number} localTime 本地时间
         * @type {Number} result 获取的最终时间差
         * @type {Boolean} canSend 独立于时间差之外的另一个判断条件
         */
        let interval = configure.sendTime,
            standard = data.canSendTime + interval,
            timeDiff = configure.timeDiff,
            localTime = new Date().getTime() - timeDiff,
            result = Math.sqrt(Math.pow((localTime - standard), 2)),
            canSend = data.canSend;
        if (result < 200 || canSend) {
            return true;
        } else {
            return false
        }
    }

    /**
     * 发送本地记录数据到后台。使用同步发送，卡住浏览器
     * @param {Object} data 本地存储对象
     * @param {Object} configure 本地配置
     * @return {Bollean} 数据是否发送成功
     */
    sendData(data, configure = this.configure) {
        const url = configure.url;
        /**
         * 发送数据前需要对数据进行处理
         * 删除不需要的属性
         * @type {Object}
         */
        let ajaxData = {
            token: data.basetoken,
            basetimekey: data.basetimekey,
            userkey: data.baseukey,
            dataList: data.dataList
        };
        // console.log(ajaxData);
        let List = ajaxData.dataList;
        if (List) {
          for (let v=0;v<List.length;v++) {
              delete List[v].index;
          }
        }
        $.ajax({
            type: 'POST',
            async: false,
            url: url,
            data: JSON.stringify(ajaxData),
            success: function() {
                console.log("发送数据");
            }
        });
        /**
         * 数据发送完成后需要删除已经不存在的页面。
         * @type {[type]}
         */
        let newData = this.delData(data);
        this.setData(newData);
    }

    /**
     * 定时保存当前页面的数据,普通页面情况。
     * 同时判断当前页面是否是视频播放页面
     * @param {Object} configure 本地配置
     * @return {Bollean} 是否保存成功
     */
    saveData(configure = this.configure) {
        let saveTime = configure.saveTime,
            self = this,
            data = self.getData();
        self.setData(self.updata(data));
        console.log("保存数据");
        setTimeout(() => {
            self.saveData();
        }, saveTime);
    }

    /**
     * 获取当前页面url和时间混合的md5值作为参数之一,获得相同页面的存在数量
     * @param {Object} data 本地存储对象
     * @param {Object} configure 本地配置
     * @param {Object} local 脚本初始化数据对象
     * @return {String} 混合后的Md5值
     */
    getKey(data, configure = this.configure, local = this.local) {
        let url = window.location.href,
            time = this.local.basetimespan,
            list = data.dataList,
            arr = list.length,
            self = this;
        /**
         * 判断是否属于初次打开活独立单一页面；
         */
        const {
            flag,
            index
        } = this.firOpen(url, list);
        if (flag) {
            configure.key = md5(url, time);
            configure.index = 1;
        } else {
            configure.key = list[index].key;
            list[index].index++;
        }
    }

    /**
     * 从本地取得数据
     * @param {String} Name 本地存储键名
     * @return {Object} 本地数据对象
     */
    getData(Name = this.configure.dataName) {
        return JSON.parse(localStorage.getItem(Name));
    }

    /**
     * 数据在存储到本地前的格式化和验证
     * 视屏播放页采用不同的记录方式。
     * @param {Object} data 本地存储对象
     * @param {Object} configure 本地配置
     * @param {Object} local 脚本初始化数据对象
     * @return {Object} data本地存储对象
     */
    updata(data, configure = this.configure, local = this.local) {
        /**
         * 存在vTime大于0的情况下，说明该页面必然为视频播放页面。
         * @type {[type]}
         */
        const self = this,
              key = configure.key,
              url = window.location.href,
              saveTime = configure.saveTime;
            /**
             * 当前页面是否存在播放时间和courseID.
             */
        let vTime =null,
            courseID= null,
            pevUrl = configure.parentUrl,
            list = data.dataList;

        if(window.basepageltime){
          vTime = basepageltime
        };
        if(window.CourseId){
          courseID= CourseId
        };
        /**
         * 判断是否需要新建记录
         * 判断当前页面是否属于视屏播放页面。
         */
        const {
            flag,
            index
        } = this.firOpen(url, list);
        if (flag) {
            /**
             * 当前页面不为视频播放页面和课程详情页面
             */
            if (!courseID) {
                list.push({
                    key: key,
                    url: url,
                    startTime: local.basetimespan,
                    staylength: 0,
                    index: 1
                });
                data.endTime = local.basetimespan;
            } else {
              /**
               * 进一步判断是视屏播放页面还是课程详情页面
               */
              if (!vTime) {
                list.push({
                    key: key,
                    url: url,
                    startTime: local.basetimespan,
                    staylength: 0,
                    courseid:CourseId,
                    index: 1
                });
                data.endTime = local.basetimespan;
              } else {
                /**
                 * 首先当前页面为播放页面，当存在pevUrl时
                 * 说明页面视屏地址已经切换，此时，且当前视屏
                 * 属于新打开视频，那么需要找到上一个视屏的记录
                 * 将index置为0，好在下一次发送后进行删除
                 */
                if (pevUrl) {
                    for (let v =0;v<list.length;v++) {
                        if (list[v].url === pevUrl) {
                            list[v].index = 0;
                        }
                    }
                } //此处对象需要多传入一个值
                pevUrl = url;
                list.push({
                    key:md5(url,thisbasepagelstarttime),
                    url: url,
                    startTime: thisbasepagelstarttime||null,
                    staylength: 0,
                    studylong: basepageltime,
                    courseid:CourseId,
                    sortid:thissortId||null,
                    index: 1
                });
                data.endTime = thisbasepagelstarttime||null;
              }
            }
        } else {
            /**
             * 当前页面不为新打开页面，且属于视频播放页面，
             * 找到原来的记录，将记录的打开次数设置为0，
             * 下次即可清除该记录。
             */
            if (courseID) {
              if (vTime > 0) {
                  for (let v =0;v<list.length;v++) {
                      if (list[v].url === pevUrl) {
                          list[v].index = 0;
                      }
                  }
                  pevUrl = url;
                  list[index].index = 1;
                  list[index].courseid=CourseId;
                  list[index].sortid= thissortId;
                  list[index].studylong = basepageltime;
              }
            }
            list[index].staylength += saveTime;
            /**
             * 更新本地数据结束时间
             */
            data.endTime = list[index].staylength+list[index].startTime;
        }
        return data;
    }

    /**
     * 判断当前页面是否属于初次打开或者不存在相同页面
     * @param {String} url 当前页面url地址
     * @param {Array} list 页面记录集合
     * @return {Boolean} 判断当前页面是否属于初次打开
     */
    firOpen(url, list) {
        /**
         * 如果list无数据，整个记录属于新纪录，是初次打开。
         * list中找不到url相同的记录，该页面初次打开且不存
         * 在相同页面
         */
        if (list.length === 0) {
            let flag = true;
            return {
                flag
            };
        }
        for (let i = 0; i < list.length; i++) {
            if (list[i].url === url) {
                let flag = false,
                    index = i;
                return {
                    flag,
                    index
                };
            }
        }
        let flag = true;
        return {
            flag
        };
    }

    /**
     * 将数据存储到本地
     * @param {String} Name 本地存储键名
     * @return {Boolean} 是否成功保存
     */
    setData(data, Name = this.configure.dataName) {
        data = JSON.stringify(data);
        localStorage.setItem(Name, data);
    }

    /**
     * 数据发送完成后将删除已经关闭的页面记录对象
     * @param {Object} data 本地存储数据对象
     * @return {Object} 删除后的新对象
     */
    delData(data) {
        let List = data.dataList;
        /**
         * 遍历记录列表，找出index为0的对象，说明该页面已经关闭，从数组中删除它
         * @type {Number}
         */
        for (let i = 0; i < List.length; i++) {
            if (List[i].index === 0) {
                List.splice(i, 1);
            }
        }
        return data;
    }

    /**
     * 页面关闭前的执行函数
     * @param {String}
     * @param {Function}
     * @return {Object}
     */
    beforeClose_handler(configure = this.configure) {
        let self = this,
            data = self.getData(),
            List = data.dataList,
            key = configure.key;
        for (let v =0;v< List.length;v++) {
            if (List[v].key === key) {
                List[v].index--;
            }
        }
        // console.log((List[this.configure.key]).index);
        data.canSend = true;
        self.setData(data);
        self.setData(data);

        // let arr = 0;
        // //数据就剩一条了，需要发送一次数据，不再删除本地的所有数据
        // for (let v of List) {
        //     if (v.index > 0) {
        //         arr++;
        //     }
        // }
        // if (arr === 0) {
        //     self.sendData(data);
        //     // localStorage.clear();
        //     return null;
        // }
    }
    befClose() {
        let self = this;
        window.onbeforeunload = function() {
            self.beforeClose_handler();

        };

    }
}
