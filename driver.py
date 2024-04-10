from flask import Blueprint, render_template, request
import analysis
import warnings
from statsmodels.stats.proportion import proportions_ztest

app = Blueprint('app', __name__)

from main import config

def add_colname( column, fmt ):
    for i in range(len(fmt)):
        fmt[i]['classes'] = [c.replace("sent-", f"{column}-sent-") for c in fmt[i]['classes']]
    return fmt

def format_data( json, key, ref_json=None ):
    """
    Given output from the analysis function,
    this function formats a single entry 
    according to the specifications in config.yml
    """

    # Extra formatting information beyond the raw text:
    flags = []

    # Get the entry in question
    data = json[key]

    # TL;DR summary line for this feature
    tldr = ""

    if config.data[key].plot_type == "histogram":
        if data:
            # For easier comparison, we compute the bar heights
            # manually with a fixed width. Using np.hist can give
            # outputs with unequal bin sizes that are hard to render
            # nicely using plot.ly
            n_points = len(data)
            width = config.data.hist.bin_size
            left_edge  = min(data) - (min(data) % width)
            right_edge = max(data) + (width - max(data) % width)
            ys     = []
            widths = []
            xs     = []
            for x in range(left_edge, right_edge+1, width):
                ys.append(0)
                widths.append(width/2 - 0.5)
                xs.append(x)
            for point in data:
                ys[(point - left_edge)//5] += 1
            ys = [100 * y / n_points for y in ys]
            texts  = [f"{y:.0f}% of sentences contain between {x} and {x+width-1} words" for x, y in zip(xs, ys)]
            data = {
                "x": xs,
                "y": ys,
                "width": widths,
                "text": texts,
                "hoverinfo": "text",
                "type": "bar",
                "textfont": {
                    "color": "rgba(0,0,0,0)",
                },
            }
        else:
            data = {
                "x": [],
                "y": [],
                "width": [],
                "type": "bar",
            }
    elif config.data[key].plot_type == "line":
        if data:
            ys = []
            texts = []
            smoothed = data[0][0]
            for i in range(len(data)):
                count, text = data[i]
                if "smooth" in config.data[key] and not config.data[key].smooth:
                    smoothed = count
                else:
                    smoothed = 0.5*(smoothed + count)
                ys.append(smoothed)
                texts.append(text)
            data = {
                "text": texts,
                "hoverinfo": "text",
                "opacity": 0.35,

                "x": [i for i in range(len(data))],
                "y": ys,
                "hoverinfo": "text",
                "mode": "markers",
                "type": "scatter",
            }
        else:
            data = {
                "x": [],
                "y": [],
                "line": {"shape": "linear"},
                "type": "lines",
            }
    elif config.data[key].plot_type == "scatter":
        if data:
            xs = []
            ys = []
            texts = []
            for i in range(len(data)):
                x, y, text = data[i]
                xs.append(x)
                ys.append(y)
                texts.append(text)
            data = {
                "text": texts,
                "hoverinfo": "text",
                "opacity": 0.35,

                "x": xs,
                "y": ys,
                "hoverinfo": "text",
                "mode": "markers",
                "type": "scatter",
            }
        else:
            data = {
                "x": [],
                "y": [],
                "line": {"shape": "linear"},
                "type": "lines",
            }

    # 
    if key == 'avg-length' and ref_json != None:
        diff = data - ref_json[key]
        if diff > config.tldr.sent_len_warning_threshold:
            tldr = f"<b>Your sentences are {'longer' if diff > 0 else 'shorter'}</b> than the reference, by {round(abs(diff),1)} words on average."

    # Round the output to the specified number of decimal places
    if config.data[key].do_round:
        fmt_str = f"{{0:0.{config.data[key].round_places}f}}"
        data = fmt_str.format(data)
        
    # Display the value as a percentage of another key.
    # Optionally include explanatory text describing
    # what the denominator represents.
    if config.data[key].percent_of:
        count = data
        denom = json[config.data[key].percent_of]
        pct_of = config.data[key].percent_explanation

        if denom > 0:
            percent = 100 * data / denom
            data = f"{percent:.1f}% ({data} "
            if pct_of:
                data = data + f" {pct_of})"
            else:
                data = data + ")"
        else:
            data = f"{data}"

        if ref_json:
            ref_count = ref_json[key]
            ref_denom = ref_json[config.data[key].percent_of]
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                z, _ = proportions_ztest([count+1, ref_count+1], [denom+1, ref_denom+1])
            flags += ["stdev-3"] if abs(z) > 3 else \
                     ["stdev-2"] if abs(z) > 2 else \
                     ["stdev-1"] if abs(z) > 1 else \
                     []
            
            if key == "nominalization-count":
                if z > config.tldr.z_threshold:
                    tldr = f"<b>You use significantly {'more' if z > 0 else 'fewer'} nominalizations</b> than the reference text."
            elif key == "passive-count":
                if z > config.tldr.z_threshold:
                    tldr = f"<b>You use significantly {'more' if z > 0 else 'fewer'} passive verbs</b> than the reference text."
            elif key == "1p-subj-count":
                if abs(z) > config.tldr.z_threshold:
                    tldr = f"<b>You use the first person significantly {'more' if z > 0 else 'less'} often</b> than the reference text."

    # Prepend or append explanatory text or units
    if config.data[key].text_before:
        data = f"{config.data[key].text_before} {data}"
    if config.data[key].text_after:
        data = f"{data} {config.data[key].text_after}"
    
    return data, flags, tldr

def output_all( json, ref_json=None ):
    plot_json = dict()
    id_json = dict()
    table_json = dict()
    raw_json = dict()
    tldr_json = {
        "lines": [],
    }
    for key in json:
        if key in config.data and config.data[key].display == "raw":
            raw_json[key] = json[key]
            continue
        data, flags, tldr = format_data( json, key, ref_json )
        if tldr:
            tldr_json["lines"].append(tldr)
        if config.data[key].display == "plot":
            plot_json[key] = {
                "div": config.data[key].div,
                "data": data,
            }
        if config.data[key].display == "id":
            id_json[key] = {
                "id": config.data[key].id,
                "data": data,
            }
        if config.data[key].display == "table":
            table_json[key] = {
                "data": data,
                "label": config.data[key].label,
                "tooltip": config.data[key].tooltip,
                "order": config.data[key].order,
                "style": ' '.join(flags) if flags else "",
            }
    return plot_json, id_json, table_json, raw_json, tldr_json

@app.route('/feedback')
def feedback():
    return render_template('feedback.html', nav="feedback")

@app.route('/help')
def help():
    return render_template('help.html', nav="help")

@app.route('/about')
def about():
    return render_template('about.html', nav="about")

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/analyze', methods=["POST"])
def analyze():
    """
    Runs all analysis passes on input texts, and returns
    statistics and formatting information to update the
    webpage.
    """
    sender = request.environ.get('HTTP_ORIGIN', 'default value')
    if sender not in config.domains.allow:
        return ""
    user_text = request.form["userText"]
    ref_text = request.form["refText"]

    user_stats, user_fmt = analysis.get_stats( user_text )
    ref_stats, ref_fmt   = analysis.get_stats( ref_text )

    user_plots, user_ids, user_tables, user_raw, tldrs = output_all( user_stats, ref_stats )
    reference_plots, reference_ids, reference_tables, reference_raw, _ = output_all( ref_stats )

    print(tldrs)
    
    user_fmt = add_colname("user", user_fmt)
    ref_fmt = add_colname("reference", ref_fmt)
    return {
        "tables": {
            "user": user_tables,
            "reference": reference_tables,
        },
        "ids": {
            "user": user_ids,
            "reference": reference_ids,
        },
        "raw": {
            "user": user_raw,
            "reference": reference_raw,
        },
        "plots": {
            "user": user_plots,
            "reference": reference_plots,
        },
        "formatting": {
            "user": user_fmt,
            "reference": ref_fmt,
        },
        "tldrs": tldrs,
    }

@app.app_errorhandler(404)
def error404(err):
    return render_template('404.html'), 404
