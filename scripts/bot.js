'use strict';

function bot() {

  var minDelay = 100,
      maxDuration = 300;

  var sel,
      botName = "",
      mode = "off",
      face,
      tease,
      body,
        messages,
        learninal,
        learninalSel,
      menu,
        pendingDialogue,
        availableDialogues;

  function robot(selection) {

    sel = selection;
    sel.classed("bot", true).attr("id", botName);
    face = sel.append("div").classed("face", true);
    menu = sel.append("div").classed("menu", true);
    body = sel.append("div").classed("body", true);
    messages = body.append("div").classed("messages", true);
    learninalSel = body.append("div").classed("learninal", true);
    tease = sel.append("div").classed("tease", true);

    tease.append("div").classed("message", true).text("Welcome to the Bloomberg Learninal! I'm Paulbot and I'll be your guide today.");
    tease.append("button").text("Open Learninal").on("click", function() { robot.mode("on"); });
    tease.append("button").text("Go away").on("click", function() { robot.mode("off"); });

    face.on("click", function() { robot.mode("tease"); });
    robot.mode("off");

    learninal = new Sandbox.View({
      el: learninalSel[0],
      model: new Sandbox.Model(),
      placeholder: "Write code, hit 'Enter'"
    });

    // Listen to dispatcher
    learninal.model.dispatcher.on("evaluate", function(item) {
      messages.append("div").classed("message", true).classed("usercode", true).html(learninal.toEscaped(item.command) + "<br/> ⇒ "+learninal.toEscaped(item.result));
      body.node().scrollTop = body.node().scrollHeight;
    })

    return robot;

  }

  robot.botName = function(_) {
    if (!arguments.length) return botName;
    botName = _;
    return robot;
  };

  robot.mode = function(_) {
    // off, tease, on
    if (!arguments.length) return mode;
    mode = d3.functor(_).call(robot);
    sel.attr("data-mode", mode);
    return robot;
  }

  robot.menu = function(_) {
    if (!arguments.length) return availableDialogues;
    availableDialogues = _;
    menu.selectAll("li")
      .data(Object.keys(availableDialogues).sort(d3.ascending))
      .enter()
      .append("li")
      .append("button")
      .style("cursor", "pointer")
      .text(function(d) { return d; })
      .on("click", function(d) {
        robot.dialogue(availableDialogues[d]);
      });

    return robot;
  };

  robot.emote = function(emotion) {
    emotion = d3.functor(emotion).call(robot);
    face.style('background-image', "url('images/emotes/" + emotion + ".gif')");
    return true;
  }

  robot.speak = function(text) {

    if(!text) text="";
    text = d3.functor(text).call(robot);

    return new Promise(
      function(resolve,reject) {

        var speech = messages.append("div").classed("message", true).classed("speech", true);
        var delay = Math.min(minDelay, maxDuration / text.length);
        var speechTimer = setInterval(function() {
          if(speech.text().length == text.length) {
            clearInterval(speechTimer);
            resolve(speech);
          }
          speech.text(text.substr(0,speech.text().length+1));
          body.node().scrollTop = body.node().scrollHeight;
        },delay);

      }
    )
  }

  robot.eval = function(text) {

    if(!text) text="";
    text = d3.functor(text).call(robot);

    return new Promise(
      function(resolve,reject) {

        learninal.model.evaluate(text);
        resolve(true);

        // var code = messages.append("div").classed("message", true).classed("code", true);
        // var delay = Math.min(minDelay, maxDuration / text.length);
        // var codeTimer = setInterval(function() {
        //   if(code.text().length == text.length) {
        //     clearInterval(codeTimer);
        //     eval(text);
        //     resolve(code);
        //   }
        //   code.text(text.substr(0,code.text().length+1));
        //   body.node().scrollTop = body.node().scrollHeight;
        // },delay);

      }
    );
  }

  robot.prompts = function(newPrompts) {

    if(!newPrompts) newPrompts = [];
    newPrompts = d3.functor(newPrompts).call(robot);

    return new Promise(
      function(resolve,reject) {

        var responses = messages.append("div").classed("message", true).classed("responses", true);

        var rSel = responses.selectAll(".response")
          .data(newPrompts, function(d) { return d.prompt; });

        rSel.enter()
          .append("div")
          .classed("response", true)
          .text(function(d) { return (d.link ? "☛ " : "» ") + d.prompt; })
          .on("click", function(d) {

            d3.select(this).classed("clicked", true);

            if(d.dialogue) {
              robot.dialogue(d.dialogue).then(function(value) {
                resolve(value);
              });
            } else if(d.link) {
              window.open(d.link, '_blank');
              resolve(true);
            } else {
              resolve(true);
            }

          });

        rSel.exit()
          .remove();

        body.node().scrollTop = body.node().scrollHeight;

        return true;

      }
    );
  }

  robot.test = function(testArg) {
    return new Promise(
      function(resolve,reject) {
        learninalSel.style("display", "block");
        body.node().scrollTop = body.node().scrollHeight;
        var onEvaluate = function(item) {
          if(testArg.call(robot, item)) {
            // if test passes
            learninal.model.dispatcher.off("evaluate", onEvaluate);
            learninalSel.style("display", "none");
            resolve();
          } else {
            // if test fails
          }
        }
        learninal.model.dispatcher.on("evaluate", onEvaluate);
      }
    );
  }

  robot.dialogue = function(pending) {

    pending = d3.functor(pending).call(robot).slice(0);
    pendingDialogue = pending;

    return new Promise(
      function(resolve,reject) {

        if(!pending || pending.length == 0) resolve(true);

        var current = pending.shift();
        var promises = [];

        for (var key in current) {
          if (current.hasOwnProperty(key)) {
            promises.push(robot[key].call(robot, current[key]));
          }
        }

        Promise.all(promises).then(function(value) {

          if(pending.length > 0) {
            robot.dialogue(pending).then(function(value) { resolve(value); });
          } else {
            resolve(true);
          }

        }, function(reason) {

          reject(reason);

        });

      }
    );

  }

  function coordsFromSel(sel) {
    var bounds = sel.node().getBoundingClientRect();
    return [bounds.left + bounds.width/2, bounds.top + bounds.height/2];
  }

  return robot;
}