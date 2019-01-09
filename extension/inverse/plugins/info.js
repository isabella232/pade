(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["converse"], factory);
    } else {
        factory(converse);
    }
}(this, function (converse) {
    var bgWindow = chrome.extension ? chrome.extension.getBackgroundPage() : null;
    var infoDialog = null;
    var Strophe = converse.env.Strophe;
    var $iq = converse.env.$iq;
    var moment = converse.env.moment;

    converse.plugins.add("info", {
        'dependencies': [],

        'initialize': function () {
            _converse = this._converse;

            PreviewDialog = _converse.BootstrapModal.extend({
                initialize() {
                    _converse.BootstrapModal.prototype.initialize.apply(this, arguments);
                    this.model.on('change', this.render, this);
                },
                toHTML() {
                  return '<div class="modal" id="myModal"> <div class="modal-dialog modal-lg"> <div class="modal-content">' +
                         '<div class="modal-header"><h1 class="modal-title">Media Content Preview</h1><button type="button" class="close" data-dismiss="modal">&times;</button></div>' +
                         '<div class="modal-body"></div>' +
                         '<div class="modal-footer"><button type="button" class="btn btn-danger" data-dismiss="modal">Close</button></div>' +
                         '</div> </div> </div>';
                },
                afterRender() {

                    if (this.model.get("type") == "image")
                    {
                        this.el.querySelector('.modal-body').innerHTML = '<img id="pade-preview-image" src="' + this.model.get("url") + '"/>';
                    }
                    else

                    if (this.model.get("type") == "video")
                    {
                        this.el.querySelector('.modal-body').innerHTML = '<video controls id="pade-preview-image" src="' + this.model.get("url") + '"/>';
                    }
                    else

                    if (this.model.get("type") == "audio")
                    {
                        this.el.querySelector('.modal-body').innerHTML = '<audio controls id="pade-preview-image" src="' + this.model.get("url") + '"/>';
                    }

                    this.el.querySelector('.modal-title').innerHTML = "Media Content Preview<br/>" + this.model.get("url");
                }
            });

            console.log("info plugin is ready");
        },

        'overrides': {
            ChatBoxView: {

                renderToolbar: function renderToolbar(toolbar, options) {
                    var result = this.__super__.renderToolbar.apply(this, arguments);

                    var view = this;
                    var id = this.model.get("box_id");
                    var jid = this.model.get("jid");
                    var type = this.model.get("type");

                    if (getSetting("enableInfoPanel", false) && type === "chatroom")
                    {
                        addToolbarItem(view, id, "pade-info-" + id, '<a class="fas fa-info-circle" title="Information"></a>');
                    }

                    setTimeout(function()
                    {
                        var occupants = view.el.querySelector('.occupants');
                        var infoButton = document.getElementById("pade-info-" + id);

                        if (occupants && infoButton)
                        {
                            var infoElement = occupants.insertAdjacentElement('afterEnd', newElement('div', null, null, 'plugin-infobox'));
                            infoElement.style.display = "none";

                            infoButton.addEventListener('click', function(evt)
                            {
                                evt.stopPropagation();

                                var chat_area = view.el.querySelector('.chat-area');

                                if (infoElement.style.display == "none")
                                {
                                    infoElement.style.display = "";
                                    removeClass('full', chat_area);
                                    removeClass('col-12', chat_area);
                                    addClass('col-md-9', chat_area);
                                    addClass('col-8', chat_area);
                                    addClass('hidden', view.el.querySelector('.occupants'));

                                    infoElement.innerHTML = getHTML(id, jid);

                                    createContentSummary(jid, id);
                                    createWorkgroups(jid, id);
                                    createMylinks(jid, id);

                                } else {
                                    infoElement.style.display = "none"
                                    removeClass('col-md-9', chat_area);
                                    removeClass('col-8', chat_area);
                                    addClass('full', chat_area);
                                    addClass('col-12', chat_area);
                                    hideElement(view.el.querySelector('.occupants'));
                                }

                            }, false);
                        }
                    });

                    return result;
                }
            }
        }
    });

    var createMylinks = function(jid, id)
    {
        if (bgWindow && (bgWindow.pade.activeH5p || bgWindow.pade.activeUrl))
        {
            _converse.connection.sendIQ($iq({type: "get"}).c("query", {xmlns: "jabber:iq:private"}).c("storage", {xmlns: "storage:bookmarks"}).tree(), function(resp)
            {
                var urls = resp.querySelectorAll('url');

                var h5pCount = document.getElementById(id + "-h5p-count");
                var h5pDetail = document.getElementById(id + "-h5p-details");
                var pdfCount = document.getElementById(id + "-pdf-count");
                var pdfDetail = document.getElementById(id + "-pdf-details");
                var appsCount = document.getElementById(id + "-apps-count");
                var appsDetail = document.getElementById(id + "-apps-details");

                var h5pHtml = "", h5pKount = 0, pdfHtml = "", pdfKount = 0, appsHtml = "", appsKount = 0;

                for (var i=0; i<urls.length; i++)
                {
                    console.debug('createMylinks', urls[i]);

                    if (urls[i].getAttribute("name") != "Video conferencing web client")
                    {
                        if (isH5PURL(urls[i].getAttribute("url")))
                        {
                            h5pKount++;
                            var checked = bgWindow.pade.activeH5p == urls[i].getAttribute("url") ? "checked" : "";
                            h5pHtml += '<input name="info_h5p_url" class="info_active_url" ' + checked + ' type="radio" value="' + urls[i].getAttribute("url") + '"/>&nbsp;' + urls[i].getAttribute("name") + '<br/>';

                        }
                        else

                        if (isPDFURL(urls[i].getAttribute("url")))
                        {
                            pdfKount++;
                            var checked = bgWindow.pade.activeUrl == urls[i].getAttribute("url") ? "checked" : "";
                            pdfHtml += '<input name="info_url" class="info_active_url" ' + checked + ' type="radio" value="' + urls[i].getAttribute("url") + '"/>&nbsp;' + urls[i].getAttribute("name") + '<br/>';

                        }
                        else {
                            appsKount++;
                            var checked = bgWindow.pade.activeUrl == urls[i].getAttribute("url") ? "checked" : "";
                            appsHtml += '<input name="info_url" class="info_active_url" ' + checked + ' type="radio" value="' + urls[i].getAttribute("url") + '"/>&nbsp;' + urls[i].getAttribute("name") + '<br/>';
                        }
                    }
                }

                if (h5pCount) h5pCount.innerHTML = h5pKount;
                if (pdfCount) pdfCount.innerHTML = pdfKount;
                if (appsCount) appsCount.innerHTML = appsKount;

                var htmlArray = [{html: h5pHtml, ele: h5pDetail}, {html: pdfHtml, ele: pdfDetail}, {html: appsHtml, ele: appsDetail}];

                for (var i = 0; i < htmlArray.length; i++)
                {
                    if (htmlArray[i].ele)
                    {
                        var element = newElement('div', null, htmlArray[i].html);
                        htmlArray[i].ele.insertAdjacentElement('afterEnd', element);

                        element.addEventListener('click', function(evt)
                        {
                            evt.stopPropagation();

                            var activeUrls = document.getElementsByClassName("info_active_url");

                            for (var k=0; k<activeUrls.length; k++)
                            {
                                console.debug("createMylinks click", activeUrls[k].value, activeUrls[k].checked);

                                if (activeUrls[k].checked)
                                {
                                    if (activeUrls[k].value.indexOf("/h5p/") > -1)
                                    {
                                        bgWindow.pade.activeH5p = activeUrls[k].value;
                                    }
                                    else {
                                        bgWindow.pade.activeUrl = activeUrls[k].value;
                                    }
                                }
                            }
                        });
                    }
                }

            }, function (error) {
                console.error("createMylinks", error);
            });
        }
    }

    var createWorkgroups = function(jid, id)
    {
        console.debug("createWorkgroups", jid, id);

        if (jid.startsWith("workgroup-"))
        {
            var workGroup = jid.split("@")[0].substring(10);

            _converse.connection.sendIQ($iq({type: 'get', to: "workgroup." + _converse.connection.domain}).c('workgroups', {jid: _converse.connection.jid, xmlns: "http://jabber.org/protocol/workgroup"}).tree(), function(resp)
            {
                var workgroups = resp.querySelectorAll('workgroup');
                var count = document.getElementById(id + "-wg-others-count");

                if (count) count.innerHTML = workgroups.length;

                var detail = document.getElementById(id + "-wg-others-details");

                if (bgWindow && detail)
                {
                    var html = "";

                    for (var i=0; i<workgroups.length; i++)
                    {
                        var jid = workgroups[i].getAttribute('jid');
                        var name = Strophe.getNodeFromJid(jid);
                        var room = 'workgroup-' + name + "@conference." + _converse.connection.domain;
                        var checked = bgWindow.pade.activeWorkgroup.jid == jid ? "checked" : "";

                        console.debug("get workgroups", room, jid);
                        html += '<input name="info_active_workgroup" type="radio" ' + checked + ' value="' + jid + '"/>&nbsp;' + name + '<br/>';
                    }

                    var element = newElement('div', null, html);

                    element.addEventListener('click', function(evt)
                    {
                        evt.stopPropagation();

                        var activeWorkgroup = document.getElementsByName("info_active_workgroup");

                        for (var i=0; i<activeWorkgroup.length; i++)
                        {
                            console.debug("createWorkgroups other click", activeWorkgroup[i].value, activeWorkgroup[i].checked);
                            if (activeWorkgroup[i].checked) bgWindow.setActiveWorkgroup(bgWindow.pade.participants[activeWorkgroup[i].value]);
                        }
                    });

                    detail.insertAdjacentElement('afterEnd', element);
                }

            }, function (error) {
                console.warn("Workgroups not available");
            });

            if (bgWindow && bgWindow.pade.fastpath[workGroup])
            {
                console.debug("createWorkgroups", workGroup, bgWindow.pade.fastpath[workGroup]);

                var fastpath = bgWindow.pade.fastpath[workGroup];
                var queueCount = document.getElementById(id + "-wg-queue-count");

                if (queueCount) queueCount.innerHTML = fastpath.count;

                var queueDetail = document.getElementById(id + "-wg-queue-details");

                if (queueDetail)
                {
                    var html = '<table>';
                    var props = Object.getOwnPropertyNames(fastpath);

                    for (var i=0; i<props.length; i++)
                    {
                        if (props[i] == "oldest" || props[i] == "joinTime")
                        {
                            var moment_time = fastpath[props[i]];
                            moment_time = moment_time.substring(0,4) + "-" + moment_time.substring(4,6) + "-" + moment_time.substring(6);
                            html += '<tr><td>' + props[i] + '</td><td>' + moment(moment_time).fromNow() + '</td></tr>'
                        }
                        else

                        if (props[i] != "conversations")
                        {
                            html += '<tr><td>' + props[i] + '</td><td>' + fastpath[props[i]] + '</td></tr>'
                        }

                    }
                    html += '</table>';

                    queueDetail.insertAdjacentElement('afterEnd', newElement('div', null, html));
                }

                var keys = Object.getOwnPropertyNames(fastpath.conversations);
                var chatsDetail = document.getElementById(id + "-wg-chats-details");
                var chatsCount = document.getElementById(id + "-wg-chats-count");

                if (chatsCount) chatsCount.innerHTML = keys.length;


                if (chatsDetail)
                {
                    for (var k=0; k<keys.length; k++)
                    {
                        var conversation = fastpath.conversations[keys[k]];

                        console.debug("createWorkgroups conversation", conversation);

                        var html = '<li href="#" name="' + conversation.sessionJid + '" title="' + conversation.question + '">' + conversation.username + ' (' + conversation.agent + ')</li>';
                        var element = newElement('div', null, html);

                        element.addEventListener('click', function(evt)
                        {
                            evt.stopPropagation();

                            console.debug("createWorkgroups click", evt.target);
                            _converse.api.rooms.open(evt.target.name);

                        });

                        chatsDetail.insertAdjacentElement('afterEnd', element);
                    }
                }
            }
        }
    }

    var createContentSummary = function(jid, id)
    {
        var media = {photo:{urls:[]}, video:{urls:[]}, link:{urls:[]}, vmsg:{urls:[]}, ppt:{urls:[]}};

        console.debug("createContentSummary", jid, id);

        _converse.api.archive.query({before: '', max: 9999999, 'groupchat': true, 'with': jid}, messages => {

            for (var i=0; i<messages.length; i++)
            {
                var body = messages[i].querySelector('body');
                var from = messages[i].querySelector('forwarded').querySelector('message').getAttribute('from').split("/")[1];

                if (body)
                {
                    var str = body.innerHTML;
                    var urls = str.match(/(https?:\/\/[^\s]+)/g);

                    if (urls && urls.length > 0)
                    {
                        for (var j=0; j<urls.length; j++)
                        {
                            var pos = urls[j].lastIndexOf("/");
                            var file = urls[j].substring(pos + 1);

                            console.debug("media", i, j, from, file, urls[j]);

                            if (isAudioURL(file))
                            {
                                media.vmsg.urls.push({url: urls[j], file: file, from: from, type: "audio"});
                            }
                            else

                            if (isImageURL(file))
                            {
                                media.photo.urls.push({url: urls[j], file: file, from: from, type: "image"});
                            }
                            else

                            if (isVideoURL(file))
                            {
                                media.video.urls.push({url: urls[j], file: file, from: from, type: "video"});
                            }
                            else

                            if (isOnlyOfficeDoc(file))
                            {
                                media.ppt.urls.push({url: urls[j], file: file, from: from, type: "doc"});
                            }
                            else

                            if (isH5p(urls[j]))
                            {
                                media.ppt.urls.push({url: urls[j], file: file, from: from, type: "h5p"});
                            }

                            else {
                                media.link.urls.push({url: urls[j], file: urls[j], from: from, type: "link"});
                            }
                        }
                    }
                }
            }

            renderMedia(id, "vmsg", media.vmsg.urls);
            renderMedia(id, "photo", media.photo.urls);
            renderMedia(id, "video", media.video.urls);
            renderMedia(id, "ppt", media.ppt.urls);
            renderMedia(id, "link", media.link.urls);

            console.debug("media", media);
        });
    }

    var getHTML = function(id, jid)
    {
        console.debug("getHTML", jid, id);

        var html = '<h3>Media Content</h3>' +
                   '<details>' +
                   '    <summary id="' + id + '-photo-details">Photos (<span id="' + id + '-photo-count">0</span>)<span style="float: right;" class="fa fa-photo"/></summary>' +
                   '</details>' +
                   '<details>' +
                   '    <summary id="' + id + '-video-details">Videos (<span id="' + id + '-video-count">0</span>)<span style="float: right;" class="fa fa-video"/></summary>' +
                   '</details>' +
                   '<details>' +
                   '    <summary id="' + id + '-link-details">Shared Links (<span id="' + id + '-link-count">0</span>)<span style="float: right;" class="fas fa-link"/></summary>' +
                   '</details>' +
                   '<details>' +
                   '    <summary id="' + id + '-vmsg-details">Voice Messages (<span id="' + id + '-vmsg-count">0</span>)<span style="float: right;" class="fa fa-file-audio"/></summary>' +
                   '</details>' +
                   '<details>' +
                   '    <summary id="' + id + '-ppt-details">Interactive Content (<span id="' + id + '-ppt-count">0</span>)<span style="float: right;" class="fa fa-file-powerpoint"/></summary>' +
                   '</details>';

        if (jid.startsWith("workgroup-"))
        {
            html += '<h3>This Workgroup</h3>' +
                    '<details>' +
                    '    <summary id="' + id + '-wg-queue-details">Queue (<span id="' + id + '-wg-queue-count">0</span>)<span style="float: right;" class="fas fa-info-circle"/></summary>' +
                    '</details>' +
                    '<details>' +
                    '    <summary id="' + id + '-wg-chats-details">Conversations (<span id="' + id + '-wg-chats-count">0</span>)<span style="float: right;" class="fa fa-user"/></summary>' +
                    '</details>' +
                    '<details>' +
                    '    <summary id="' + id + '-wg-others-details">Other Workgroups (<span id="' + id + '-wg-others-count">0</span>)<span style="float: right;" class="fas fa-users"/></summary>' +
                    '</details>';
        }

        if (bgWindow && (bgWindow.pade.activeH5p || bgWindow.pade.activeUrl))
        {
            html += '<h3>Collaborative Links</h3>' +
                    '<details>' +
                    '    <summary id="' + id + '-pdf-details">PDF Documents (<span id="' + id + '-pdf-count">0</span>)<span style="float: right;" class="fa fa-file"/></summary>' +
                    '</details>'+
                    '<details>' +
                    '    <summary id="' + id + '-apps-details">Applications (<span id="' + id + '-apps-count">0</span>)<span style="float: right;" class="fas fa-globe"/></summary>' +
                    '</details>';

            if (bgWindow.pade.activeH5p)
            {
                html += '<details>' +
                        '    <summary id="' + id + '-h5p-details">H5P Interactive Content (<span id="' + id + '-h5p-count">0</span>)<span style="float: right;" class="fa fa-h-square"/></summary>' +
                        '</details>';
            }
        }

        return html;
    }

    var isH5PURL = function (url)
    {
      const filename = url.toLowerCase();
      return filename.indexOf("/h5p/") > -1
    };

    var isPDFURL = function (url)
    {
      const filename = url.toLowerCase();
      return filename.endsWith('.pdf');
    };

    var isAudioURL = function (url)
    {
      const filename = url.toLowerCase();
      return filename.endsWith('.ogg') || filename.endsWith('.mp3') || filename.endsWith('.m4a');
    };

    var isImageURL = function (url)
    {
      const filename = url.toLowerCase();
      return filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png') || filename.endsWith('.gif') || filename.endsWith('.bmp') || filename.endsWith('.tiff') || filename.endsWith('.svg');
    };

    var isVideoURL = function (url)
    {
      const filename = url.toLowerCase();
      return filename.endsWith('.mp4') || filename.endsWith('.webm');
    };

    var isOnlyOfficeDoc = function (url)
    {
        var onlyOfficeDoc = false;
        var pos = url.lastIndexOf(".");

        if (pos > -1)
        {
            var exten = url.substring(pos + 1);
            onlyOfficeDoc = "doc docx ppt pptx xls xlsx csv pdf".indexOf(exten) > -1;
        }
        return onlyOfficeDoc;
    };

    var isH5p = function (url)
    {
        return url.indexOf("/h5p/") > -1;
    };

    var sortUrls = function (a,b)
    {
        if ( a.file < b.file )
            return -1;
        if ( a.file > b.file )
            return 1;
        return 0;
    };

    var newItemElement = function(el, item, className)
    {
        item.ele = document.createElement(el);

        item.ele.name = item.type;
        item.ele.title = item.url;
        item.ele.innerHTML = item.file || item.url;
        item.ele.classList.add(className);
        document.body.appendChild(item.ele);

        item.ele.addEventListener('click', function(evt)
        {
            evt.stopPropagation();
            console.debug("media item clicked", evt.target.name, evt.target.title);

            if (evt.target.name == "image" || evt.target.name == "audio" || evt.target.name == "video")
            {
                previewDialog = new PreviewDialog({'model': new converse.env.Backbone.Model({url: evt.target.title, type: evt.target.name}) });
                previewDialog.show();
            }
            else {  // insert into textarea
                replyInverseChat(evt.target.title);
            }

        });

        return item.ele;
    }

    var renderMedia = function (id, eleName, urls)
    {
        urls.sort(sortUrls);

        var count = document.getElementById(id + "-" + eleName + "-count");
        var detail = document.getElementById(id + "-" + eleName + "-details");

        if (detail && count && urls.length > 0)
        {
            count.innerHTML = urls.length;

            for (var i=0; i<urls.length; i++)
            {
                detail.insertAdjacentElement('afterEnd', newItemElement('li', urls[i], "mediaItem"));
            }
        }
    }

    var hideElement = function (el)
    {
        return addClass("hidden", el);
    }

    var addClass = function (className, el)
    {
      if (el instanceof Element)
      {
        el.classList.add(className);
      }
      return el;
    }

    var removeClass = function (className, el)
    {
      if (el instanceof Element)
      {
        el.classList.remove(className);
      }
      return el;
    }

    var newElement = function(el, id, html, className)
    {
        var ele = document.createElement(el);
        if (id) ele.id = id;
        if (html) ele.innerHTML = html;
        if (className) ele.classList.add(className);
        document.body.appendChild(ele);
        return ele;
    }

    var addToolbarItem = function(view, id, label, html)
    {
        var placeHolder = view.el.querySelector('#place-holder');

        if (!placeHolder)
        {
            var smiley = view.el.querySelector('.toggle-smiley.dropup');
            smiley.insertAdjacentElement('afterEnd', newElement('li', 'place-holder'));
            placeHolder = view.el.querySelector('#place-holder');
        }
        placeHolder.insertAdjacentElement('afterEnd', newElement('li', label, html));
    }
}));
