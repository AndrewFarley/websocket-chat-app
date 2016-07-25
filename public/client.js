$(document).ready(function() {
	var socket = new WebSocket('ws://localhost:8081/'); //Use localhost (to test only on your browsers) or your machine IP to test witin a network
	var user = {id: null, name: "No Name"};
	var chat_area = '<div class="chat_area"></div>';
	var chat_w = {};
	
	socket.onopen = function(event) {
		log('Opened connection client');
	}

	socket.onerror = function(event) {
		log('Error: ' + JSON.stringify(event));
	}

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
						html += '<li data-userid="'+val.id+'" data-username="'+val.name+'"><span><strong>'+val.name+you+'</strong></span><button class="btn btn-primary btn-sm leftsp" '+dis+' '+dis_others+'>Chat</button></li>';
					});
					$("#active_users").html(html);
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
						chat_w[from_user].panel.content.find(".chat_area").append('<p class="chat_area_p"><strong>'+d.name+' : </strong>'+d.message+'</p>');
					} else {
						var cpanel = $.jsPanel({
							container: 'body',
							headerTitle: d.name.toUpperCase(),
							content: chat_area,
							contentSize:  { width: 500, height: 300 },
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
									callback: function( event ){
										var m = event.data.content.parent().find('.chat_input').val() || "No Input", json;
										event.data.content.find(".chat_area").append('<p class="chat_area_p"><strong>You : </strong>'+m+'</p>');
										event.data.content.parent().find('.chat_input').val("");
										json = {
											type: "msgFromUser",
											to_user: from_user,
											from_user: user.id,
											message: m
										}
										socket.send(JSON.stringify(json));
									}
								}
							]
						});
						cpanel.content.find(".chat_area").append('<p class="chat_area_p"><strong>'+d.name+' : </strong>'+d.message+'</p>');
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
		
		var cpanel = $.jsPanel({
			container: 'body',
			headerTitle: name.toUpperCase(),
			content: chat_area,
			contentSize:  { width: 500, height: 300 },
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
					callback: function( event ){
						var m = event.data.content.parent().find('.chat_input').val() || "No Input", json;
						event.data.content.find(".chat_area").append('<p class="chat_area_p"><strong>You : </strong>'+m+'</p>');
						event.data.content.parent().find('.chat_input').val("");
						json = {
							type: "msgFromUser",
							to_user: id,
							from_user: user.id,
							message: m
						}
						socket.send(JSON.stringify(json));
					}
				}
			]
		});
		chat_w[id] = {
			panel: cpanel
		}
	});
	
	//Log function
	function log(text) {
		if($("#log ul li").length > 200) {
			$("#log ul").empty();
		}
		$("#log ul").append("<li>"+text+"</li>");
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
	//Page load jsPanel for getting username
	var jspanelStart = $.jsPanel({
		container: 'body',
		paneltype: 'modal',
		headerTitle: "Enter Your Name",
		content: '<form class="form-inline" onsubmit="return false;"><div class="form-group"><label for="exampleInputName2">Name : </label><input type="text" class="form-control name_input leftsp" id="exampleInputName2" placeholder="Jane Doe"></div><button class="btn btn-primary leftsp" id="name_input_btn">Submit</button></form>',
		contentSize:  { width: 400, height: 100 },
		theme: "bootstrap-primary",
		onclosed: function(e) {
			//console.log(e);
		}
	});
	//Page load name modal button handler
	$(document).on("click", "#name_input_btn", function(e) {
		if(!$(this).parent().find("input").val()) {
			alert("Please enter your name");
			return false;
		}
		var data = JSON.stringify({ type: "nameUpdate", username: $(this).parent().find("input").val() });
		user.name = $(this).parent().find("input").val();
		socket.send(data);
		jspanelStart.close();
	});
	//Show info click handler
	var show_info_panel = false;
	$(document).on("click", "#show_info", function() {
		if(show_info_panel) {
			return;
		}
		var panel = $.jsPanel({
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
