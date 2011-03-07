$( function() {

    //INIT THE CLIENT
    var list = $('#ajax-list');
    var criteria = $('form.criteria');
    var meta = $('#browser .meta');
    var keyup_timer = false;
    var section = window.location.pathname;

    meta.sort = meta.find('.sort select');
    meta.dir = meta.find('.sort a.order');
    list.css('min-height', document.documentElement.clientHeight - 240);

    //set the section 
    window.section = section;

    var old_q = false; //init old_query
    var limit = 5;
    var page = 0;
    var pages = 0;

    var Browser = {
        table: false,
        keyword: false,
        q: false,
        parent: list.parent().get(0),
        count:0,
        onRow: {
            'default': function (row) {
                var ret = '<tr id="row-'+row._id+'" rel="'+row._id+'"><td><h4>'+row.name+'</h4></td></tr>';
                return ret;
            }
        },
        update: function(options) {
            //  alert(section);
            var self = Browser;
            self.keyword = criteria.find('input[name=keyword]').val();
            self.subject = criteria.find('input[name=subject]').val() || '';
            self.q = criteria.serialize();

            if(old_q == self.q && !options) {
                return(false);
            } else {
                old_q = self.q;
            }

            $('#browser .create.button.openbox').attr('rel',section+'/'+self.subject+'/create');
            $('#browser .import.button.openbox').attr('rel',section+'/'+self.subject+'/import');

            page = options.page?parseInt(options.page):0;
            if(page < 0)
                page = 0;

            var sort = meta.sort.val();
            var dir = meta.dir.hasClass('desc')?'-1':'1';

            var offset = page*limit;
            var jsonUrl = section+((self.subject.length > 0)?'/'+self.subject:'')+'/search'

            $.getJSON(jsonUrl,self.q+'&offset='+offset+'&limit='+limit+'&sort='+sort+'&dir='+dir, function (response) {
                var html = '';
                self.count = response.results.length;//response.count;
                self.table = $('<table class="list"></table>');
                list.empty().append(self.table); 
                $.each(response.results, function(i,row) {
                    if (self.onRow[section+"/"+self.subject] && typeof self.onRow[section+"/"+self.subject] === 'function') {
                      html += self.onRow[section+"/"+self.subject].call(self,row);
                    } else {
                      html += self.onRow["default"].call(self,row);
                    }
                });
                self.table.html(html);
                // Pagination
                var pagination = new Array();
                pages = Math.floor(self.count / limit) + 1;

                for(i = 0; i < response.count / limit; i++) {
                    if(Math.abs(page - i) < 6 || i < 1 || i > pages-2)
                        pagination.push('<a rel="'+i+'"'+(page==i?' class="selected"':'')+'>'+(i+1)+'</a>');
                }

                meta.find('.pagination').html(pagination.join(' | '));
                meta.find('.found').html('page'+' <b>'+(page+1)+'</b> / '+pages+'');
            });
        }
    }
    criteria.change(Browser.update);
    Browser.update(true);

    // Object handles items (right panel)
    var ObjectPane = {
        url: false,
        load: function(url, callback) {
            this.url = url;

            $('#object').show().find('.ajax').hide().load(url, function() {
                $(this).show();

                if(object_tab && $(this).find('.tabs li[rel='+object_tab+']').click().length == 1) {
                } else
                    $(this).find('.tabs li:first').click();

                //	loadFeed();

                $(this).find('.attach').each( function() {
                    //			createUploader(this);
                });
                //	$(this).find('.tags:empty').html('<p>'+loc('add_tags')+'</p>');

                if(callback)
                    callback.call(this);
            });
        },
        hide: function() {
        },
        reload: function() {
            this.load(this.url);
        }
    }
    window.ObjectPane = ObjectPane;
    var object_tab = $.cookie('object_tab_'+section);
    $('#object').delegate('.tabs li', 'click', function() {
        if($(this).attr('rel')) {
            object_tab = $(this).attr('rel');
            $.cookie('object_tab_'+section, object_tab);
        }
    });
    list.delegate('tr', 'click', function() {
        if($(this).attr('rel')) {
            var subject = criteria.find('input[name=subject]').val() || 'apps';
            window.location.hash = 'id:'+$(this).attr('rel');
            url_id = $(this).attr('rel');

            $(this).addClass('selected').siblings().removeClass('selected');
            ObjectPane.load(section+'/'+subject+'/show/'+$(this).attr('rel'));
        }
    });
    $('.tabs li').live('click', function() {
        if($(this).attr('rel')) {
            $(this).siblings().removeClass('selected');
            $(this).addClass('selected');

            $('.tab').hide();
            $($(this).attr('rel')).show();
        }
    });
    $('#sidebar li').live('click', function() {
        $(this).addClass('selected').siblings().removeClass('selected');
        $(this).parents('ul').next('input').val($(this).attr('rel')).change().submit();
    });
    // Openbox
    $('#container .openbox, a.openbox').live('click', function() {
        var self = $(this);
        self.addClass('hover');

        var box = $('<div class="openbox loading"><span class="arrow"></span><div class="ajax"></div><a class="x"></a></div>');
        $(document.body).append(box);

        if($(this).hasClass('openbox-wide'))
            box.addClass('wide');

        if($(this).attr('rel'))
            box.find('div.ajax').load($(this).attr('rel'), function() {
                box.removeClass('loading');
                box.find('input[type=text], textarea').eq(0).focus();
            });
        var offset = $(this).offset();
        offset.left += $(this).get(0).offsetWidth / 2;
        offset.top += $(this).get(0).offsetHeight;

        if(offset.left + 40 > document.body.clientWidth)
            box.addClass('tight');

        if(offset.left < 280)
            box.addClass('left');

        box.css(offset).fadeIn(250);

        var hide = function(e) {
            if(e.type == 'close' || $(e.target).is('a.x') || (e.target != box.get(0) && $(e.target).parents('div.openbox').length == 0)) {
                box.fadeOut(100, function() {
                    $(this).remove();
                });
                self.removeClass('hover');
            }
        };
        $(document.body).click(hide);
        box.find('a.x').click(hide);

        box.bind('close', hide)
    })
    function split( val ) {
        return val.split( /\ \s*/ );
    }

    function extractLast( term ) {
        return split( term ).pop();
    }

    $('.feed form textarea').elastic();
    $('.feed form textarea').autocomplete({
        source: function( request, response ) {
            if(extractLast(request.term).substring(0,1) == "@") {
                $.getJSON( "/admin/users/search", {
                    keyword: extractLast( request.term ).substring(1)
                }, function(userResponse) {
                    var resp = [];

                    for (var i in userResponse.results) {
                        var nobj = {};
                        nobj.label = userResponse.results[i].name;
                        nobj.data = {};
                        nobj.data.id = userResponse.results[i].id;
                        nobj.data.type = "user";
                        resp.push(nobj);

                    } 
                    response (resp);
                });
                //response ([{ 'label':'user1', 'data': {'id':'IDOIJSDOIJF','name':'hello','type':'user'} }]);
            } else if (extractLast(request.term).substring(0,1) == "#") {
                $.getJSON( "/admin/trigger/search", {
                    keyword: extractLast( request.term ).substring(1)
                }, function(triggerResponse) {
                    var resp = [];

                    for (var i in triggerResponse.results) {
                        var nobj = {};
                        nobj.label = triggerResponse.results[i].name;
                        nobj.data = {};
                        nobj.data.id = triggerResponse.results[i].id;
                        nobj.data.type = "trigger";
                        resp.push(nobj);

                    } 
                    response (resp);

                });
                //response ([{ 'label':'trigger1', 'data': {'id':'asjkljklasjklas','name':'ZU SPät','type':'trigger'} }]);
            }
            return response;
            /*$.getJSON( "/feed/mentions/search", {
             term: extractLast( request.term )
             }, response );*/
        },
        search: function() {
            // custom minLength
            var term = extractLast( this.value ); 
            if ( term.length < 2 || (term.substring(0,1) != "@" && term.substring(0,1) != "#")) {
                return false;
            }
        },
        focus: function() {
            // prevent value inserted on focus
            return false;
        },
        select: function( event, ui ) {
            var terms = split( this.value );
            var users = removeEmptyElements($(this).parent().children('input[name="users"]').val().split(','));
            var triggers = removeEmptyElements($(this).parent().children('input[name="triggers"]').val().split(','));
            $(this).parent().children('input[name="trigger_type"]').val('user_trigger');

            if(ui.item.data.type == "user") {
                users.push(ui.item.data.id);
                $(this).parent().children('input[name="users"]').val(users.join(','));
            } else if (ui.item.data.type == "trigger") {
                triggers.push(ui.item.data.id);
                $(this).parent().children('input[name="triggers"]').val(triggers.join(','));
            }

            // remove the current input
            terms.pop();
            // add the selected item
 
            terms.push( ui.item.label+"" );

            // add placeholder to get the comma-and-space at the end
            terms.push( "" );
            this.value = terms.join( " " );
            return false;
        }
    });

    $('#object').delegate('.tags', 'click', function(e) {
        if(!$(this).hasClass('edit')) {
            var text = [];
            $(this).find('a').each( function() {
                text.push($(this).text());
            });
            text = text.join(', ');

            var self = $(this).addClass('edit');

            $(this).html('<input type="text" />');

            var update = function() {
                var val = input.val()
                var tags = val.split(', ');

                self.empty().removeClass('edit').hide().fadeIn();

                $.each(tags, function(i, v) {
                    self.append('<a>'+html(v)+'</a>');
                });
                if(val != text) {
                    $.post(self.parents('.editbox').attr('rel'), {
                        field: 'tags',
                        value: val
                    });
                }

                if(val == '') {
                    self.html('<p>'+loc('add_tags')+'</p>');
                }
            };
            var input = $(this).find('input').val(text).focus().blur(update);

            input.keypress( function(e) {
                var code = (e.keyCode ? e.keyCode : e.which);
                if(code == 13)
                    update();
            });
        }
    });
    $('#object').delegate('dd', 'click', function(e) { 
        if(!$(this).hasClass('edit') && !$(e.target).is('a')) {
            var text = $(this).text();
            var self = $(this).addClass('edit');

            if($(this).hasClass('multiline'))
                $(this).html('<textarea rows="'+(text.split("\n").length - 1)+'"></textarea>');
            else
                $(this).html('<input type="text" />');

            var update = function() {
                var val = input.val();
                self.html(val).removeClass('edit').hide().fadeIn();

                if(val != text) {
                    $.post(self.parents('.editbox').attr('rel'), {
                        field: self.attr('rel'),
                        value: val
                    });
                }
            };
            var input = $(this).find('input,textarea').val(text).focus().blur(update);

            if(!$(this).hasClass('multiline')) {
                input.keypress( function(e) {
                    var code = (e.keyCode ? e.keyCode : e.which);
                    if(code == 13)
                        update();
                });
            }
        }
    });
    $('#object').delegate('.editable', 'click', function(e) {
        if(!$(this).hasClass('edit') && !$(e.target).is('a')) {
            var text = $(this).text();
            var self = $(this).addClass('edit');

            $(this).html('<input type="text" />');

            var update = function() {
                var val = input.val();
                self.html(val).removeClass('edit').hide().fadeIn();

                if(val != text) {
                    $.post(self.parents('.editbox').attr('rel'), {
                        field: self.attr('rel'),
                        value: val
                    });
                }
            };
            var input = $(this).find('input,textarea').val(text).focus().blur(update);

            if(!$(this).hasClass('multiline')) {
                input.keypress( function(e) {
                    var code = (e.keyCode ? e.keyCode : e.which);
                    if(code == 13)
                        update();
                });
            }
        }
    });
    $('#object').delegate('.edit-description', 'click', function(e) {
        var textarea = $(this).parent().prev();

        var text = textarea.text();
        var self = textarea.addClass('edit');

        textarea.html('<textarea class="autoresize"></textarea>');

        var update = function() {
            var val = input.val();
            self.html(val).removeClass('edit').hide().fadeIn();

            if(val != text) {
                $.post(self.parents('.editbox').attr('rel'), {
                    field: 'description',
                    value: val
                });
            }
        };
        var input = textarea.find('textarea').val(text).focus().blur(update).keyup();
    });
    var feed, messages, rel_type;
    var feed_i = 0;

    var loadFeed = function(last_i) {
        if(last_i)
            feed_i += last_i;
        else
            feed_i = 0;

        feed = $('#feed'); 
        if(feed.length == 0)
            return(false);

        messages = feed.find('.messages');
        rel_type = feed.attr('rel').split('=')[0];

        var url = '/feed?'+feed.attr('rel');
        if(feed_i)
            url += '&offset='+feed_i;

        $.getJSON(url, function(json) {
            /*messages.empty();*/ 
            $.each(json, appendFeed);

            messages.children('div').fadeIn(); 
            if(json.length > 50) {
                messages.append('<a class="more">'+loc('more')+'</a>');
            }

            if(feed.attr('rel') == '' && json.length == 0) {
                messages.html(loc('feed_empty')).children().fadeIn();
            }
        });
    }
    var appendFeed = function(i, json, live) { 
        if(i >= 50)
            return(false);
        if(document.getElementById('message-'+json._id))
            return(false);

        var classes = ['message'];

        if(live && !focused)
            classes.push('unread');
        if(json.type == 'task' && json.data && json.data.done)
            classes.push('done');

        var ret = '<div id="message-'+json._id+'" class="'+classes.join(' ')+'" rel="'+json._id+'">'+(json.from)+": "+json.text+'<span class="reldate" rel="'+json.updated+'">'+reldate(json.updated)+'</span><span class="rels">';

        var actions = [];
        if(json.trigger_type == "user_trigger")
            actions.push('<a class="confirm">'+('confirm')+'</a>');
        if(!json.replies)
            actions.push('<a class="comment">'+loc('comment')+'</a>');

        ret += '<p class="actions">'+actions.join(' - ')+'</p>';

        if(json.replies) {
            ret += '<div class="replies">';
            $.each(json.replies, function(e, json) {
                ret += '<div>'+(json.name)+'<span class="reldate" rel="'+json.updated+'">'+reldate(json.updated)+'</span>'+htmlp(json.text)+'</div>';
            });
        } else {
            ret += '<div class="replies" style="display: none;">';
        }

        ret += '<textarea></textarea></div></div>';

        if(!live)
            messages.append(ret);
        else
            return ret;
    }
    loadFeed();

    $('.feed .actions a').live('click', function() {
        if($(this).hasClass('comment')) {
            $(this).parent().next().fadeIn().find('textarea').focus();
        }
        if($(this).hasClass('confirm')) {

            var reply = $(this).parents('.message').attr('rel');

            $.post('/feed/'+reply+"/confirm", {text: this.value});
            this.value = '';

            return(false);
        }
    });
    $('.feed ul.types li').live('click', function() {
        $(this).addClass('selected').siblings().removeClass('selected');

        var form = $(this).parents('form');
        form.find('input.trigger_type').val($(this).attr('rel'));

        form.find('.extra').hide().find('input').attr('disabled', true);
        form.find('.extra.'+$(this).attr('rel')).fadeIn().find('input').attr('disabled', false);
    });
    $('.feed textarea').live('blur', function() {
        if(this.value == '' && $(this).siblings().length == 0)
            $(this).parent().hide().prev('a.comment').show();
    });
    $('.feed .messages textarea').live('keypress', function(e) {
        if(e.keyCode == 13 && this.value.match(/\S/)) {
            var reply = $(this).parents('.message').attr('rel');

            $.post('/feed/'+reply+"/reply", {text: this.value});
            this.value = '';

            return(false);
        }
    });
    
     
    
});

function autoHeightIFrame(e) {
  e.height = $('.main-box').height();  
}



function htmlp(string) {
    string = string.replace(/((https?)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]!\?])/g, function(url) {
        return '<a href="'+url+'">'+url+'</a>';
    });
    string = string.replace(/((?:\S+)@(?:\S+))([.,?!)]?(\s|$))/g, '<a href="mailto:$1">$1</a>$2');
    string = '<p>'+string.replace(/\n/g, '<br />').replace(/(\<br \/\>\s*){2,}/g, '</p><p>')+'</p>';

    return string;
}

function removeEmptyElements (arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == "") {
            arr.splice(i, 1);
            i--;
        }
    }
    return arr;
};

function reldate(ts) {
    ts = Math.round(ts/1000);
    var now = Math.round(new Date().getTime()/1000);
    var dif = now-ts;

    if(dif < 0)
        dif = 0;

    if(dif < 60)
        var d = Math.floor(dif)+' '+loc('sec_ago');
    else if(dif < 3600)
        var d = Math.floor(dif/60)+' '+loc('min_ago');
    else if(dif < 86400)
        var d = Math.floor(dif/3600)+' '+loc('hours_ago');
    else
        var d = Math.floor(dif/86400)+' '+loc('days_ago');

    return d;
}

function loc(key) {
    return key;
}

