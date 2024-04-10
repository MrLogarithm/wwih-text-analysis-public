import re
from main import config
from collections import defaultdict
from math import log

########################################
# SpaCy Setup

import spacy as sp
spacy = sp.load('en_core_web_sm', exclude=["ner", "textcat", "custom"])

########################################
# Helper Methods

# List of POS tags to ignore when analyzing
# text. These are mainly punctuation tags
# which do not represent words and should
# not be included in the total word count.
PUNC_TAGS = set([
    "_SP", ":", ",", ".", "HYPH", "XX",
    "``", "''",
    "-LRB-", "-RRB-",
    "-LSB-", "-RSB-",
    "-LCB-", "-RCB-",
])
# Punctuation that we count and report on:
COUNTABLE_PUNC = set([
    ":", ",", "HYPH"
])
# List of suffixes used to identify "zombie
# nouns". List reproduced from
# https://shortishard.com/2018/03/28/words-to-watch-for-zombie-nouns/
NOMINALIZATIONS = set([
    "able",
    "ance",
    "ation",
    "ence",
    "ency",
    "ian",
    "ion",
    "ism",
    "ty",
    "ment",
    "ness",
    "sion",
])

########################################
# Main Analysis Method

def get_stats( text ):
    """
    Main analysis method. Iterates over the
    tokens identified by spacy and aggregates
    statistics about the input text into
    a summary JSON dict.
    """

    results = {
            "sent-lens": [],
            "prep-density": [],
            "be-density": [],
            "nom-density": [],
            "pass-density": [],
            "be-count": 0,
            "verb-count": 0,
            "prep-count": 0,
            "passive-count": 0,
            "1p-subj-count": 0,
            "2p-subj-count": 0,
            "3p-subj-count": 0,
            "subj-count": 0,
            "clausal-subj-count": 0,
            "nominalization-count": 0,
            #"punc-count": defaultdict(int),
            "complexity": [],
    }

    results["char-count"] = len(text)

    # Remove footnotes immediately after a period
    # for better sentence segmentation:
    text = re.sub("([a-zA-Z])\.\\[?[0-9]+\\]? ", "\\1. ", text)
    
    # Document-level features:
    formatted_output = []
    density = {
            "prepositions": [],
            "be-verbs": [],
            "nominalizations": [],
            "passives": [],
    }
    density_text = {
            "prepositions": [],
            "be-verbs": [],
            "nominalizations": [],
            "passives": [],
    }

    # Sentence-level features:
    sent_len = 0
    sent_ntoks = 0
    
    spacy_doc = spacy(text)

    if config.data.density.method == "fixed-size":
        density_window_size = config.data.density.window_size
    else:
        density_window_size = len(spacy_doc) / config.data.density.n_windows

    for token in spacy_doc:
        # List of classes and HTML #ids this word belongs to
        # (used by the UI to apply CSS formatting)
        classes = set()

        # At the start of a sentence, record 
        # length of the preceding sentence and
        # reset the value of the sentence-level features
        if token.is_sent_start:
            if sent_len >= 5:
                results["sent-lens"].append(sent_len)
            elif sent_len > 0:
                tags = [tag for _,_,_,_, tag in formatted_output[-sent_ntoks:]]
                if not all(tag in ["CD", ".", "_SP"] for tag in tags):
                    results["sent-lens"].append(sent_len)
            sent_len = 0
            sent_ntoks = 0
            span_id = f"sent-{len(results['sent-lens'])}"
            span_start = "start-" + span_id
        else:
            span_id = f"sent-{len(results['sent-lens'])}"
            span_start = ""
        
        # Detect nominalizations by checking for suffixes
        lowered_text = token.text.lower()
        if any(
                lowered_text.endswith(suffix) 
                for suffix in NOMINALIZATIONS
            ):
            results["nominalization-count"] += 1
            classes.add("nominalization")
            classes.add("highlighted")
            density["nominalizations"].append(1)
            density_text["nominalizations"].append(token.text.upper())
        else:
            density["nominalizations"].append(0)
            density_text["nominalizations"].append(token.text.lower())

        # Count instances of n-th person verbs.
        # Only counts matrix subjects (where head.dep
        # is ROOT); remove the head.dep check to 
        # include all subjects.
        if token.head.dep_ == "ROOT":
            # Look for subject:
            if token.dep_.startswith("nsubj"):
                if token.lemma_ in ["I", "we"]:
                    results["1p-subj-count"] += 1
                    classes.add("p1-subj")
                    classes.add("highlighted")
                elif token.lemma_ in ["you"]:
                    results["2p-subj-count"] += 1
                else:
                    results["3p-subj-count"] += 1
                results["subj-count"] += 1
            elif token.dep_.startswith("csubj"):
                results["clausal-subj-count"] += 1

        # Count be-verbs by checking spacy lemmas
        if token.lemma_ == "be":
            results["be-count"] += 1
            classes.add("be-verb")
            classes.add("highlighted")
            density["be-verbs"].append(1)
            density_text["be-verbs"].append(token.text.upper())
        else:
            density["be-verbs"].append(0)
            density_text["be-verbs"].append(token.text.lower())

        # Increment sentence length, excluding punctuation
        if token.tag_ not in PUNC_TAGS and token.tag_ != "POS":
            sent_len += 1
        #elif token.tag_ in COUNTABLE_PUNC:
            #results["punc-count"][token.text] += 1
        sent_ntoks += 1

        # Count total number of verbs
        if token.tag_.startswith("V"):
            results["verb-count"] += 1

        # Count total number of prepositions.
        # Penn tags do not distinguish prepositions
        # from subordinating conjunctions, so only
        # count cases where the .dep_ confirms that
        # this is a preposition.
        if token.tag_ == "IN" and token.dep_ == "prep":
            results["prep-count"] += 1
            classes.add("preposition")
            classes.add("highlighted")
            density["prepositions"].append(1)
            density_text["prepositions"].append(token.text.upper())
        else:
            density["prepositions"].append(0)
            density_text["prepositions"].append(token.text.lower())

        # Detect passive voice by looking for an auxpass verb
        if token.dep_ == "auxpass":
            results["passive-count"] += 1
            classes.add("aux-pass")
            classes.add("highlighted")
            density["passives"].append(1)
            density_text["passives"].append(token.text.upper())
        else:
            density["passives"].append(0)
            density_text["passives"].append(token.text.lower())

        # Once the window is full, compute the frequency
        # of prepositions and append to the results. Also
        # compute a label for this point in the graph, by
        # truncating the text within the window.
        if len(density["prepositions"]) >= density_window_size:
            # Truncate long labels:
            if len(density_text["prepositions"]) > 20:
                midpoint = len(density_text["prepositions"])//2
                for figure in density_text:
                    density_text[figure] = ['...'] + \
                        density_text[figure][midpoint - 6:midpoint + 6] + \
                        ['...']
            # Record density and label text
            for source, dest in [
                ("prepositions",    "prep-density"),
                ("be-verbs",        "be-density"),
                ("nominalizations", "nom-density"),
                ("passives",        "pass-density"),
            ]:
                results[dest].append((
                sum(density[source]),
                ' '.join(density_text[source][:len(density_text[source])//2]) + \
                        "&#10;" + \
                        ' '.join(density_text[source][len(density_text[source])//2:]) 
                ))

            # Reset window contents
            for figure in density:
                density[figure] = []
                density_text[figure] = []

        # Detokenize and add info for formatting the output
        formatted_output.append((
                token.text + token.whitespace_,
                list(classes) + [span_id],
                span_start,
                token.whitespace_ == "",
                token.tag_
            ))

    # TODO Move this to driver.py so that all formatting
    # code is in the same location
    # To reduce the number of <span>s in the final
    # output, merge adjacent tokens that share the
    # same formatting information. We also shift
    # spaces outside of the highlighted span where
    # needed to neaten the final output.
    merged_spans = []
    for i in range(len(formatted_output)):
        string, classes, span_id, _, _ = formatted_output[i]
        classes = classes
        # Each class may have some tooltip text associated
        # with it in the config file. Concatenate these
        # texts now that all classes are known:
        tooltip = '&#10;'.join(
                config.data.formatting_tooltips[class_] 
                for class_ in classes 
                if class_ in config.data.formatting_tooltips
            )
        # Simply append the first span:
        if merged_spans == []:
            merged_spans.append({
                "text": string, 
                "classes": classes,
                "id": span_id,
                "tooltip": tooltip,
            })
        # If this span has the same formatting info
        # as the last, merge them:
        elif merged_spans[-1]["classes"] == classes and span_id == "":
            merged_spans[-1] = ({
                "text": merged_spans[-1]["text"] + string,
                "classes": classes,
                "id": merged_spans[-1]["id"],
                "tooltip": tooltip,
            })
        # If the last span is highlighted and ends in a space,
        # move the space to this span for nicer-looking output:
        elif merged_spans[-1]["text"][-1] == " " and merged_spans[-1]["classes"] != [] and len(classes) == 1:
            merged_spans[-1]["text"] = merged_spans[-1]["text"][:-1],
            merged_spans.append({
                "text": " " + string, 
                "classes": classes,
                "id": span_id,
                "tooltip": tooltip,
            })
        # If none of the above conditions hold, do nothing
        else:
            merged_spans.append({
                "text": string, 
                "classes": classes,
                "id": span_id,
                "tooltip": tooltip,
            })
        
    # Record the length of the last sentence
    if sent_len > 0:
        results["sent-lens"].append(sent_len)

    # TODO append final window of density estimators?

    ##################################
    # DERIVED STATISTICS

    # Derive word count from sentence lengths
    results["word-count"] = sum(results["sent-lens"])

    # Mean, max, deviation depend on having at least 1 sentence:
    results["max-length"] = max(results["sent-lens"]) if len(results["sent-lens"]) > 0 else 0
    results["longest-sent-id"] = results["sent-lens"].index(results["max-length"]) if len(results["sent-lens"]) > 0 else ""
    results["avg-length"] = sum(results["sent-lens"]) / len(results["sent-lens"]) if len(results["sent-lens"]) > 0 else 0
    results["len-variance"] = sum([
        (l - results["avg-length"])**2 
        for l in results["sent-lens"]
    ]) / len(results["sent-lens"]) if len(results["sent-lens"]) > 0 else 0
    results["len-stdev"] = results["len-variance"] ** 0.5

    return results, merged_spans

# Alternative get_stats() with profiling enabled:
#import cProfile, pstats
#def get_stats( text ):
    #profiler = cProfile.Profile()
    #profiler.enable()
    #result = _get_stats(text)
    #profiler.disable()
    #stats = pstats.Stats(profiler).sort_stats('ncalls')
    #stats.strip_dirs()
    #stats.dump_stats('profiler-export')
    #return result
