// Livestamp.js / v1.1.2 / (c) 2012 Matt Bradley / MIT License
(function(d,g){var h=1E3,i=!1,e=d([]),j=function(b,a){var c=b.data("livestampdata");"number"==typeof a&&(a*=1E3);b.removeAttr("data-livestamp").removeData("livestamp");a=g(a);g.isMoment(a)&&!isNaN(+a)&&(c=d.extend({},{original:b.contents()},c),c.moment=g(a),b.data("livestampdata",c).empty(),e.push(b[0]))},k=function(){i||(f.update(),setTimeout(k,h))},f={update:function(){d("[data-livestamp]").each(function(){var a=d(this);j(a,a.data("livestamp"))});var b=[];e.each(function(){var a=d(this),c=a.data("livestampdata");
  if(void 0===c)b.push(this);else if(g.isMoment(c.moment)){var e=a.html(),c=c.moment.fromNow();if(e!=c){var f=d.Event("change.livestamp");a.trigger(f,[e,c]);f.isDefaultPrevented()||a.html(c)}}});e=e.not(b)},pause:function(){i=!0},resume:function(){i=!1;k()},interval:function(b){if(void 0===b)return h;h=b}},l={add:function(b,a){"number"==typeof a&&(a*=1E3);a=g(a);g.isMoment(a)&&!isNaN(+a)&&(b.each(function(){j(d(this),a)}),f.update());return b},destroy:function(b){e=e.not(b);b.each(function(){var a=
  d(this),c=a.data("livestampdata");if(void 0===c)return b;a.html(c.original?c.original:"").removeData("livestampdata")});return b},isLivestamp:function(b){return void 0!==b.data("livestampdata")}};d.livestamp=f;d(function(){f.resume()});d.fn.livestamp=function(b,a){l[b]||(a=b,b="add");return l[b](this,a)}})(jQuery,moment);
//Application code
$(document).ready(function() {
	//socket instance
	var socket = new WebSocket('ws://localhost:8081/'); //Use localhost (to test only on your browsers) or your machine IP to test witin a network
	//current user refrence
	var user = {id: null, name: "No Name"};
	//chat messages container template
	var chat_area = '<div class="chat_area"></div>';
	//chat message wrapper
	var chat_area_m = '<div class="chat_area_msg"><div class="chat_area_msg_head" ><span class="name" ></span><span class="ts" ></span></div><div class="hr"></div><div class="chat_area_msg_body"></div></div>';
	//chat windows container
	var chat_w = {};
	var jspanelStart;
	
	socket.onopen = function(event) {
		log('Opened connection from client');
	}

	socket.onerror = function(event) {
		log('Error: ' + JSON.stringify(event));
	}
	//socket onmessage listener
	socket.onmessage = function (event) {
		try {
			var d = JSON.parse(event.data) || {};
			switch(d.type) {
				case "userIdUpdate" :
					user.id = d.id;
					break;
				case "broadcast" :
					var html = "";
					$("#active_users_cn").html(d.total);
					$.each(d.clients_arr, function(i, val) {
						var dis = (val.id == user.id) ? "disabled" : "", dis_others = "";
						if(!dis) {
							if(Object.keys(chat_w).indexOf(val.id) >= 0) {
								dis_others = "disabled";
							}
						}
						var you = (val.id == user.id) ? " (Its You)" : "";
						var tooltip = you ? 'data-toggle="tooltip" data-placement="top" title="Click here to edit your name"' : "";
						var ucls = you ? "currentUser" : "";
						html += '<li class="list-group-item '+ucls+'" data-userid="'+val.id+'" data-username="'+val.name+'"><span '+tooltip+'><strong>'+val.name+you+'</strong></span><button class="btn btn-primary btn-sm leftsp" '+dis+' '+dis_others+'>Chat</button></li>';
					});
					$("#active_users").html(html);
					$('#active_users li.currentUser span').tooltip();
					break;
				case "userDisconnected" :
					if(chat_w[d.id]) {
						chat_w[d.id].panel.close();
						delete chat_w[d.id];
					}
					break;
				case "msgToUser" :
					var from_user = d.from_user;
					if(chat_w[from_user]) {
						$(chat_area_m).find(".name").html(d.name).end().find(".ts").attr("data-livestamp", d.time).end().find(".chat_area_msg_body").html(d.message).end().appendTo(chat_w[from_user].panel.content.find(".chat_area"));
						$(chat_w[from_user].panel.content).scrollTop(chat_w[from_user].panel.content.get(0).scrollHeight);
					} else {
						var cpanel = $.jsPanel({
							container: 'body',
							position: {my: "right-bottom", at: "right-bottom"},
							headerTitle: d.name.toUpperCase(),
							content: chat_area,
							contentSize:  { width: 300, height: 200 },
							theme: "bootstrap-primary",
							contentOverflow: 'auto',
							onclosed: function() {
								delete chat_w[from_user];
							},
							footerToolbar: [
								{
									item: '<input type="text" class="form-control chat_input" placeholder="Enter some text">'
								},
								{
									item: "<button style='margin-left:5px;' type='button'><span class='...'></span></button>",
									event: "click",
									btnclass: "btn btn-primary btn-sm",
									btntext: "Send",
									callback: sendChatMessage.bind(null,{id:from_user,name:d.name})
								}
							]
						});
						$(chat_area_m).find(".name").html(d.name).end().find(".ts").attr("data-livestamp", d.time).end().find(".chat_area_msg_body").html(d.message).end().appendTo(cpanel.content.find(".chat_area"));
						$(cpanel.content).scrollTop(cpanel.content.get(0).scrollHeight);
						cpanel.content.parent().find(".chat_input").on("keypress", function(e) {
							if(e.keyCode == 13) {
								sendChatMessage({id:from_user,name:d.name},{data:cpanel});
							}
						});
						chat_w[from_user] = {
							panel: cpanel
						}
					}
					break;
				default :
				log(event.data);
			}
		} catch(e) {
			console.log(e.message);
		}
	}
	//socket onclose listener
	socket.onclose = function(event) {
		log('Closed connection from server/client');
		$("body").empty();
		var panel = $.jsPanel({
			container: 'body',
			paneltype: 'modal',
			headerTitle: "Server Disconnected",
			content: '<p><strong>Connection lost to server.</strong></p>',
			contentSize:  { width: 200, height: 100 },
			theme: "bootstrap-warning"
		});
	}

	window.addEventListener('beforeunload', function() {
		socket.close();
	});
	
	//Chat button handler
	$(document).on("click", "#active_users li button", function(e) {
		var li = $(this).parent();
		var name = li.attr("data-username"), id = li.attr("data-userid");
		$(this).prop("disabled", true);
		var cpanel = $.jsPanel({
			container: 'body',
			position: {my: "right-bottom", at: "right-bottom"},
			headerTitle: name.toUpperCase(),
			content: chat_area,
			contentSize:  { width: 300, height: 200 },
			theme: "bootstrap-primary",
			contentOverflow: 'auto',
			onclosed: function() {
				delete chat_w[id];
			},
			footerToolbar: [
				{
					item: '<input type="text" class="form-control chat_input" placeholder="Enter some text">'
				},
				{
					item: "<button style='margin-left:5px;' type='button'><span class='...'></span></button>",
					event: "click",
					btnclass: "btn btn-primary btn-sm",
					btntext: "Send",
					callback: sendChatMessage.bind(null,{id:id,name:name})
				}
			]
		});
		cpanel.content.parent().find(".chat_input").on("keypress", function(e) {
			if(e.keyCode == 13) {
				sendChatMessage({id:id,name:name},{data:cpanel});
			}
		});
		chat_w[id] = {
			panel: cpanel
		}
	});
	
	//Send chat message function, used as a callback
	function sendChatMessage(targetUser, event) {
		var m = event.data.content.parent().find('.chat_input').val() || "No Input", json;
		var time = Math.floor(+new Date / 1000);
		$(chat_area_m).find(".name").html(user.name).end().find(".ts").attr("data-livestamp", time).end().find(".chat_area_msg_body").html(m).end().appendTo(event.data.content.find(".chat_area"));
		$(event.data.content).scrollTop(event.data.content.get(0).scrollHeight);
		event.data.content.parent().find('.chat_input').val("");
		json = {
			type: "msgFromUser",
			to_user: targetUser.id,
			from_user: user.id,
			message: m,
			time: time
		}
		socket.send(JSON.stringify(json));
	}
	
	//Log function
	function log(text) {
		if($("#log ul li").length > 200) {
			$("#log ul").empty();
		}
		$("#log ul").append("<li class='list-group-item'>"+text+"</li>");
	}
	
	//Show Logs click handler
	var show_logs_panel = false;
	$(document).on("click", "#show_logs", function() {
		if(show_logs_panel) {
			return;
		}
		var timer = null, startTimer = function() {
			timer = setInterval(reload,1000);
		}
		var panel = $.jsPanel({
			container: 'body',
			headerTitle: "Application Logs",
			content: $("#log").html(),
			contentSize:  { width: 500, height: 300 },
			theme: "bootstrap-primary",
			contentOverflow: 'auto',
			onclosed: function() {
				if(timer) {
					clearInterval(timer);
					console.log("Timer :" +timer+ " Is cleared");
				}
				show_logs_panel = false;
			}
		});
		function reload() {
			panel.content.empty();
			panel.content.append($("#log").html());
		}
		startTimer();
		show_logs_panel = true;
	});
	//Page load form for getting username
	function userForm(name) {
		jspanelStart = $.jsPanel({
			container: 'body',
			paneltype: 'modal',
			headerTitle: "Enter Your Name",
			content: '<form class="form-inline" onsubmit="return false;"><div class="form-group"><label for="exampleInputName2">Name : </label><input type="text" class="form-control name_input leftsp" id="exampleInputName2" placeholder="Jane Doe"></div><button class="btn btn-primary leftsp" id="name_input_btn">Submit</button></form>',
			contentSize:  { width: 400, height: 100 },
			theme: "bootstrap-primary",
			callback: function() {
				this.content.find(".name_input").val(name ? user.name : "").focus();
			},
			onclosed: function(e) {
				//console.log(e);
			}
		});
	}
	userForm();
	//User form modal button handler
	$(document).on("click", "#name_input_btn", function(e) {
		if(!$(this).parent().find("input").val()) {
			alert("Please enter your name");
			return false;
		}
		var data = JSON.stringify({ type: "nameUpdate", username: $(this).parent().find("input").val() });
		user.name = $(this).parent().find("input").val();
		$("title").text(user.name.toUpperCase() + " | WebSocket Chat Application");
		log("Username value updated at "+moment().format('MMMM Do YYYY, h:mm:ss A')+", new value : " + user.name);
		socket.send(data);
		jspanelStart && jspanelStart.close();
	});
	
	$(document).on("click", "#active_users li.currentUser span", userForm.bind(null,true));
	
	//Show info click handler
	var show_info_panel = false;
	$(document).on("click", "#show_info", function() {
		if(show_info_panel) {
			return;
		}
		var panel = $.jsPanel({
			headerControls: {
				minimize: 'remove',
				smallify: 'remove',
				maximize: 'remove'
			},
			container: 'body',
			//paneltype: 'modal',
			headerTitle: "Your Information",
			content: '<p><strong>ID : '+(user.id || "NA")+'</strong></p><p><strong>NAME : '+(user.name || "NA")+'</strong></p>',
			contentSize:  { width: 300, height: 100 },
			theme: "bootstrap-primary",
			contentOverflow: 'auto',
			onclosed: function() {
				show_info_panel = false;
			}
		});
		show_info_panel = true;
	});
});
