var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    this.innerHTML = '<h1>Summary</h1>';
    var panel = this.nextElementSibling;
    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }
  });
}

$(document).on('click', 'a[href^="#"]', function (event) {
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);
});

$("#is-loading").hide();
$("#js-warn").hide();
$("#edit-user").hide();
$("#edit-ref").hide();
$("#bigger-user").hide();
$("#bigger-ref").hide();
$("#smaller-user").hide();
$("#smaller-ref").hide();

function download( id ) {
    // https://stackoverflow.com/questions/50192080/export-plotly-as-self-contained-html-in-javascript
    async function getPlotlyScript() {
      // fetch
      const plotlyRes = await fetch('https://cdn.plot.ly/plotly-latest.js');
      // get response as text
      return await plotlyRes.text() ;
    } 
    function getChartState () {
  const el = document.getElementById(id);
  return {
    data: el.data, // current data
    layout: el.layout // current layout
  }
}
async function getHtml() {
  const plotlyModuleText = await getPlotlyScript();
  const state = getChartState();

  return `
      <head>
        <meta charset="utf-8" />
      </head>

      <script type="text/javascript">
        ${plotlyModuleText}
      <\/script>

      <div id="plotly-output"></div>

      <script type="text/javascript">
        Plotly.newPlot(
          'plotly-output',
          ${JSON.stringify(state.data)},
          ${JSON.stringify(state.layout)}
        )
    <\/script>
  `
}
async function exportToHtml () {
  // Create URL
  const blob = new Blob([await getHtml()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Create downloader
  const downloader = document.createElement('a');
  downloader.href = url;
  downloader.download = 'export.html';

  // Trigger click
  downloader.click();

  // Clean up
  URL.revokeObjectURL(url);
}

exportToHtml();
}

function fontsize( adjustment ) {
    var currentSize = parseInt( $('#user-formatted').css('font-size') );
    $('#user-formatted').css('font-size', currentSize + adjustment + "px");
    $('#reference-formatted').css('font-size', currentSize + adjustment + "px");
}

// https://stackoverflow.com/questions/20791374/jquery-check-if-element-is-visible-in-viewport
$.fn.isInViewport = function() {
    var elementTop = $(this).offset().top;
    var elementBottom = elementTop + $(this).outerHeight();
    var viewportTop = $(window).scrollTop();
    var viewportBottom = viewportTop + $(window).height();
    return elementBottom > viewportTop && elementTop < viewportBottom;
};

$(window).on('resize scroll', function() {
    if ($('.column-left').isInViewport()) {
        $(".colour-key").slideDown();
    } else {
        $(".colour-key").slideUp();
    }
});


$(".colour-key span").click(function(){
    className = this.className.slice(0, this.className.lastIndexOf(" "));
    current_color = $("."+className).css("background-color");
    comma = current_color.lastIndexOf(',');
    base_color = current_color.slice(0, comma+1);
    alpha = current_color.slice(comma+1,-1);
    new_alpha = alpha < 0.72 ? 0.72 : 0;
    $("."+className).css("background-color",
      base_color + new_alpha + ")"
    );

    current_border = $(".key-"+className).css("border");
    new_border = current_border.lastIndexOf("(0, 0, 0, 0)") > -1 ? "2px solid black" : "2px solid transparent";
    $(".key-"+className).css("border",
        new_border
    );

});

// Hide colored output when the user clicks on it,
// and restore the text box to allow further editing.
$("#edit-user").click(function(){
    $("#user-formatted").hide();
    $("#edit-user").hide();
    $("#user-text").show();

    $("#bigger-user").hide();
    $("#smaller-user").hide();
});
$("#clear-user").click(function(){
    $("#user-formatted").hide();
    $("#edit-user").hide();
    $("#user-text").val("");
    $("#user-text").show();

    $("#bigger-user").hide();
    $("#smaller-user").hide();
});
$("#edit-ref").click(function(){
    $("#reference-formatted").hide();
    $("#edit-ref").hide();
    $("#reference-text").show();

    $("#bigger-ref").hide();
    $("#smaller-ref").hide();
});
$("#clear-ref").click(function(){
    $("#reference-formatted").hide();
    $("#edit-ref").hide();
    $("#reference-text").val("");
    $("#reference-text").show();

    $("#bigger-ref").hide();
    $("#smaller-ref").hide();
});

// Main form handler:
$("#main").submit(function(e){
    // Do not reload page
    e.preventDefault();

    // Display spinner animation
    $("#compare").hide();
    $("#is-loading").show();

    $.post({
        url: "/analyze",
        dataType: "json",
        data: {
            userText: $("#user-text").val(),
            refText:  $("#reference-text").val(),
        },
        success: function(response){
            // List of plot.ly traces expected from the API.
            // We aggregate these to allow displaying them
            // on common axes for ease of comparison.
            traces = {
                "sent-len-hist": [],
                "nom-density-graph": [],
                "prep-density-graph": [],
                "be-density-graph": [],
                "pass-density-graph": [],
            };
            // List of sentences to call out to the user in the summary.
            tldr_texts = {
                "nom-density-graph": [],
                "prep-density-graph": [],
                "be-density-graph": [],
                "pass-density-graph": [],
            };
            
            trace_fmt = {
                "sent-len-hist": {
                    title: "", //"Sentence Length Distribution",
                    xlabel: "Sentence Length",
                    ylabel: "Percent of Sentences",
                    xticktext:"auto",
                    yticktext:"auto",
                },
                "nom-density-graph": {
                    title: "", //"Nominalization Density",
                    xlabel: "",
                    ylabel: "Nominalizations &#10; per Sentence",
                    xticktext:["Beginning of Text", "End of Text"],
                    yticktext:["Few", "Many"],
                },
                "prep-density-graph": {
                    title: "", //"Preposition Density",
                    xlabel: "",
                    ylabel: "Prepositions &#10; per Sentence",
                    xticktext:["Beginning of Text", "End of Text"],
                    yticktext:["Few", "Many"],
                },
                "be-density-graph": {
                    title: "", //"be-Verb Density",
                    xlabel: "",
                    ylabel: "be-Verbs &#10; per Sentence",
                    xticktext:["Beginning of Text", "End of Text"],
                    yticktext:["Few", "Many"],
                },
                "pass-density-graph": {
                    title: "", //"Passive Voice Density",
                    xlabel: "",
                    ylabel: "Passives &#10; per Sentence",
                    xticktext:["Beginning of Text", "End of Text"],
                    yticktext:["Few", "Many"],
                },
                //"complexity-graph": {
                    //title: "", //"Nominalization Density",
                    //xlabel: "",
                    //ylabel: "Sentence &#10; Complexity",
                    //xticktext:["Short Sentences", "Long Sentences"],
                    //yticktext:["Simple", "Complex"],
                //},
            }

            for (var column of ["user", "reference"]) {

                // Print formatted output with highlighting.
                // Hide input textbox:
                $(`#${column}-text`).hide();
                // Clear old outputs:
                highlight_sel = `#${column}-formatted`;
                $(highlight_sel).html("");
                // Create highlighted spans:
                for (var span of response.formatting[column]) {
                    new_span = `
                    <span ${span.id ? "id='" + column + '-' + span.id + "'" : ""} ${false && span.tooltip ? "data-tooltip-top='" + span.tooltip + "'" : ""} class="${span.classes.join(' ')}">${span.text}</span>
                    `
                    $(new_span).appendTo(highlight_sel)
                }
                // Display highlighted output
                $(highlight_sel).show("");

                // Each response.table item gets added as
                // a row to a <table> element. 
                table_entries = [];
                for (var key in response.tables[column]) {
                    new_row = `
                      <tr>
                        <td>
                          <button type="button" data-tooltip-above class="button help-tooltip ${column}-help" data-tooltip="${response.tables[column][key].tooltip}"><b>?</b></button>
                            <b id='${column}-${key}-label' class='table-label ${column}-label'>
                                ${response.tables[column][key].label}
                            </b>
                        </td>
                        <td id='${column}-${key}-data' class='${response.tables[column][key].style}'>
                             ${response.tables[column][key].data}
                        </td>
                      </tr>`;
                    table_entries.push([response.tables[column][key].order, new_row]);
                }
                // Sort table entries:
                table_entries.sort(function (a,b){ return a[0]-b[0]});

                table_sel = `#${column}-stats`;
                // Clear old results
                $(table_sel).html("");
                // Add header
                // $(`<tr class='table-head'><td></td><td><b>${column == 'user' ? 'Your Text' : 'Reference' }</b></td><td></td></tr>`).appendTo(table_sel);
                // Add content
                for (var pair of table_entries) {
                    new_row = pair[1];
                    $(new_row).appendTo(table_sel);
                }

                // Each response.ids item gets inserted into
                // a DOM element with a matching id.
                for (var id in response.ids[column]) {
                    id_sel = `#${column}-${id}`;
                    $(id_sel).html( response.ids[column][id].data);
                }

                // Each response.plots item gets added to the
                // list of plot.ly traces
                for (var plot in response.plots[column]) {
                    var data = response.plots[column][plot].data;
                    data.name = (column == "user" ? "Your Text" : "Reference");
                    traces[`${response.plots[column][plot].div}`].push(data);
                }

                // Jump to the longest sentence when the user
                // clicks on that row of the output:
                var length_data_sel = `#${column}-max-length-data`;
                var longest_sent_id = response.raw[column]["longest-sent-id"];
                var longest_sent_start = `#${column}-start-sent-${longest_sent_id}`;
                var longest_sent_sel = `:not(.highlighted).${column}-sent-${longest_sent_id}`;
                var linked_text = $(length_data_sel).html().link("#formatted");
                $(length_data_sel).html(linked_text);
                $(length_data_sel).click(
                    function (column, start_selector, selector) {
                        return function() {
                            // Scroll to the highlighted text
                            // and flash a tan background to
                            // draw the user's eye.
                            var myElement = $(start_selector)[0];
                            var topPos = myElement.offsetTop;
                            $(`#${column}-formatted`).scrollTop(topPos);
                            $([document.documentElement, document.body]).animate({
                                scrollTop: $(`#${column}-formatted`).offset().top - 110
                            }, 500);
                            $(selector).animate(
                                {"background-color": '#D2B48C'}, 1500
                            ).animate(
                                {"background-color": '#ffffff'}, 1500
                            );
                        }
                    }(column, longest_sent_start, longest_sent_sel) // we wrap the actual function like this to freeze the value of longest_sent_sel - otherwise both buttons will highlight the start of the reference sentence.
                );
                //*/
                $(length_data_sel).click(function(a){
                    return function() {
                        console.log(a);
                    };
                }("a"));
            }

            // Aggregate plot.ly traces, compute common axis bounds,
            // and render via plot.ly:
            for (var plt in traces) {
                traces[plt][0]["marker"] = {color: ["rgba(254,  97,   0, 0.72)", ""][0]};
                traces[plt][1]["marker"] = {color: ["", "rgba(100, 143, 255, 0.72)"][1]};
                traces[plt][0]["line"] = {color: ["rgba(254,  97,   0, 0.72)", ""][0]};
                traces[plt][1]["line"] = {color: ["", "rgba(100, 143, 255, 0.72)"][1]};
            // Get axis bounds:
            xmin = Math.min(traces[plt][0].x, traces[plt][1].x);
            xmax = Math.max(traces[plt][0].x, traces[plt][1].x);
            ymin = Math.min(traces[plt][0].y, traces[plt][1].y);
            ymax = Math.max(traces[plt][0].y, traces[plt][1].y);
            // Pad data to ensure all traces span the same domain:
            for (var i of [0, 1]) {
              while (traces[plt][i].x[traces[plt][i].x.length-1] < xmax) {
                traces[plt][i].x.push(
                    traces[plt][i].x[traces[plt][i].x.length-1] + traces[plt][i].width[0]
                  );
                traces[plt][i].ys.push(0);
                traces[plt][i].width.push(
                    traces[plt][i].width[0]
                  );
                }
              while (traces[plt][i].x[0] > xmin) {
                traces[plt][i].x.unshift(
                    traces[plt][i].x[0] - traces[plt][i].width[0]
                  );
                traces[plt][i].ys.unshift(0);
                traces[plt][i].width.unshift(
                    traces[plt][i].width[0]
                  );
              }
            }
            // Add smoothed trend lines to scatterplots:
            if (plt.includes("dens")) {
                for (var idx of [0,1]) {
                    // Short samples will cause an error
                    // because there are too few points
                    // to smooth
                    windowSize = traces[plt][idx].x.length <= 51 ? 5 : 51;
                    try {
                        savgol = SavitzkyGolay(traces[plt][idx].y, traces[plt][idx].x, {"windowSize":windowSize});
                        savgol_mu = savgol.reduce((a,b)=>a+b) / savgol.length;
                        savgol_sigma = (savgol.reduce((a,b)=> a + (b-savgol_mu)**2) / savgol.length)**0.5;
                        min_sum = {
                            "nom-density-graph": 0.5,
                            "pass-density-graph": 0.2,
                            "be-density-graph": 0.75,
                            "prep-density-graph": 0.5,
                        };
                        significance_multiplier = {
                            "nom-density-graph": 1,
                            "pass-density-graph": 1,
                            "be-density-graph": 1,
                            "prep-density-graph": 1,
                        };
                        savgol_sigma *= significance_multiplier[plt];

                        window_size = 10;
                        diff_threshold = 0.1;
                        //ys = traces[plt][idx].y;
                        ys = savgol;
                        have_called_out = false;
                        callout_start = 0;
                        callout_sum = 0;
                        for (var i = 0; idx == 0 && i < traces[plt][idx].x.length; i++) {
                            l_sum = ys.slice(i, i+window_size).reduce((a,b)=>a+b,0) / window_size;
                            c_sum = ys.slice(i+window_size, i+window_size+window_size).reduce((a,b)=>a+b,0) / window_size;
                            if ( 
                                 c_sum > savgol_mu + savgol_sigma &&
                                 c_sum > min_sum[plt]
                                 //savgol[i] > savgol_mu + stdev_threshold*savgol_sigma
                                 //traces[plt][idx].x[i] > savgol_mu + stdev_threshold*savgol_sigma
                               ) {
                                traces[plt].push({
                                    x: [i+window_size*1.5, i+window_size*1.5],
                                    y: [0, Math.max(...traces[plt][idx].y)],
                                    mode: "lines",
                                    type: 'scatter',
                                    line: {color: 'rgba(255, 50, 50, 0.05)'},
                                    hoverinfo: 'none',
                                    showlegend: false,
                                });

                                if (!have_called_out) {
                                    callout_start = i+window_size;
                                    callout_sum = (c_sum - savgol_mu) / savgol_sigma;
                                    have_called_out = true;
                                }
                            } else {
                                /* do not call out spans which are too short */
                                if (have_called_out && i+window_size > callout_start+2) {
                                    console.log(callout_sum);
                                    text = traces[plt][idx].text.slice(callout_start, i+window_size).join(' ');
                                    text = text.replaceAll("&#10;", " ");
                                    text = text.replaceAll("\n", " ");
                                    text = text.replace(/ +/g, ' ');
                                    text = text.replace(/^[^A-Z]*/, '... ');
                                    text = text.replace(/[^A-Z]*$/, ' ...');
                                    tldr_texts[plt].push([plt, text, callout_sum]);
                                }
                                have_called_out = false;
                            }
                        }
                        savgol_trace = {
                            x: traces[plt][idx].x,
                            y: savgol,
                            mode: "points",
                            type: "scatter",
                            line: {color: ["#fe8d47", "#8faeff"][idx]},
                            name: ["Your Text", "Reference"][idx],
                            hoverinfo: "none",
                        };
                        traces[plt].push(savgol_trace);
                    } catch (err) {}
                }
            }
            // Draw plot:
            Plotly.newPlot(plt, traces[plt], {
                title: trace_fmt[plt].title, //"Sentence Length Distribution",
                xaxis: {
                    title: trace_fmt[plt].xlabel,
                    range: [xmin, xmax],
                    //showticklabels: trace_fmt[plt].showxticklabels,
                    tickvals: !plt.includes("hist") ? [
                        Math.min(
                            Math.min(...traces[plt][0].x), 
                            Math.min(...traces[plt][1].x), 
                        ),
                        Math.max(
                            Math.max(...traces[plt][0].x),
                            Math.max(...traces[plt][1].x),
                        ),
                    ] : "auto",
                    ticktext: trace_fmt[plt].xticktext,
                },
                yaxis: {
                    title: trace_fmt[plt].ylabel, 
                    range: [ymin, ymax], 
                    //showticklabels: trace_fmt[plt].showyticklabels,
                    tickvals: !plt.includes("hist") ? [
                        Math.min(
                            Math.min(...traces[plt][0].y), 
                            Math.min(...traces[plt][1].y), 
                        ),
                        Math.max(
                            Math.max(...traces[plt][0].y),
                            Math.max(...traces[plt][1].y),
                        ),
                    ] : "auto",
                    ticktext: trace_fmt[plt].yticktext,
                },
                barmode: "group",
              }, {
                displaylogo: false,
                hovermode: 'closest', 
                responsive: true, 
                modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toImage'],
                modeBarButtonsToAdd: [{
                    name: 'Download Interactive Plot',
                    icon: Plotly.Icons.disk,
                    direction: 'up',
                    click: function(p){ return function(gd) {download(p);} }(plt)
                  }],
              });
            }

            is_summary = false;
            $('#tldrs').html("");
            for (var line of response['tldrs']['lines']) {
                $(`<li>${line}</li>`).appendTo('#tldrs');
                is_summary = true;
            }
            // Only call out the first section.
            // Lines are appended in rough order of importance,
            // so the most important section should be first.
            console.log(tldr_texts);
            chosen_callouts = [[], [], [], []];
            i = 0;
            n = 0;
            n_callouts = 4;
            while (true) {
                have_added = false;
                for (const [idx, plt] of [
                        "nom-density-graph",
                        "prep-density-graph",
                        "be-density-graph",
                        "pass-density-graph",
                    ].entries()) {
                    if (i < tldr_texts[plt].length) {
                        chosen_callouts[idx].push(tldr_texts[plt][i]);
                        n += 1;
                        have_added = true;
                        if (n>=n_callouts){
                            break;
                        }
                    }
                }
                if (!have_added || n>=n_callouts){
                    break;
                }
                i += 1;
            }
            chosen_callouts = chosen_callouts.flat();
            for (var callout of chosen_callouts) { //if (tldr_texts.length > 0) {
                //callout = tldr_texts[0];
                console.log(callout[2]);
                feature_type = callout[0] == 'prep-density-graph' ? 'prepositions' : 
                               callout[0] == 'nom-density-graph' ? 'nominalizations' : 
                               callout[0] == 'pass-density-graph' ? 'passive verbs' : 
                               '&quot;to be&quot; verbs';
                rec = callout[0] == 'prep-density-graph' ? 'Rephrasing with fewer prepositions may make this section easier to follow.' :
                      callout[0] == 'nom-density-graph' ? "Consider replacing these with verbs or with more concrete nouns." :
                      callout[0] == 'pass-density-graph' ? 'Consider rephrasing this passage in the active voice.' : 
                      'Consider replacing these with more concrete verbs for brevity.';
                callout_text = callout[1];
                $(`<li><b>You use a lot of ${feature_type}</b> around the following section of text:<br/><p class='callout'>${callout_text}</p>${rec}</li>`).appendTo('#tldrs');
                is_summary = true;
            }
            
            // Make tables visible
            if (is_summary) {
                $("#summary-div").toggleClass("is-hidden", false);
            } else {
                $("#summary-div").toggleClass("is-hidden", true);
            }
            $("#reference-column").toggleClass( "is-hidden", false);
            $("#user-column").toggleClass("is-hidden", false);
            if ( response.tables["user"]["word-count"].data < 250 && response.tables["reference"]["word-count"].data < 250 ) {
                $("#graph-warn").toggleClass("is-hidden", false);
                $("#graph-div").toggleClass("is-hidden", true);
            } else {
                $("#graph-warn").toggleClass("is-hidden", true);
                $("#graph-div").toggleClass("is-hidden", false);
            }

            // Stop loading animation
            $("#compare").show();
            $("#is-loading").hide();
            // Reveal Edit buttons
            $("#edit-user").show();
            $("#edit-ref").show();
            $("#bigger-user").show();
            $("#bigger-ref").show();
            $("#smaller-user").show();
            $("#smaller-ref").show();

            //$([document.documentElement, document.body]).animate({
                //scrollTop: $("#input-div").offset().top
            //}, 1000);
        },
    });
    return false;
});
