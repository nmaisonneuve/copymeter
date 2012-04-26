var sentences = [];
var match_sentences = [];
var urls = {};

write_result = function (sentence) {
    var idx = sentence.idx
    var score = sentence.best_score;
    var color = (score == -1) ? "#777" : "hsl(" + (100 - (score * 100 - 20) * 100 / 80) + ", 70%, 80%)"
    $("#sentence_" + idx).css('background', color);
    $("#sentence_" + idx).mouseover(function () {
        score = Math.round(score * 100) + "%";
        var sources = sentence.copies.slice(0, Math.min(5, sentence.copies.length));
        var content = $("#sentenceInfoTemplate").render({best_sources:sources});
        $("#text_info").html(content);
        $("#text_info").show();
    });
}

process_result = function (data, sentence) {
    //console.log("------------ new sentence: "+sentence.content);
    // compute each sentence in each result
    $.each(data, function (i, result) {
        var content = result.content.replace(/(\.\.\.) ([A-Z])/g, ". $2").replace("...", "").replace(/<b>|<\/b>/, ""); // clean a bit if required
        var source = {score:0, content:"", url:result.url};
       // console.log("new result: "+content);
        content.parseSentences(function (i, text, words) {

            var score = sentence.compute_similarity_with(words);
           // console.log("new sentence to compare "+text+" ("+score+")");
            if (score > source.score) {
                source.score = score;
                source.content = text;
            }
        });
        //console.log("-- new source " + source.url + " : " + source.content + "(" + source.score + ")");

        // add source on the sentence
        sentence.add_copy(source);

        // add influence on the url
        var url = urls[source.url];
        if (typeof(url) == 'undefined') {
            url = new Url(source.url);
            urls[source.url] = url;
        }
        url.add_influence(sentence);
    });

    sentence.sort_copies();

    write_result(sentence);
}


compute_global_metrics = function () {
    var url_influences = [];
    $.each(urls, function (url, url_o) {
        url_o.compute_influence();
        url_o.score = Math.round((url_o.score / sentences.length) * 100);
        console.log(url_o.score);
        url_influences.push({url:url, score:url_o.score, sentences:url_o.sentences });
    });
    url_influences.sort(function (a, b) {
        if (a.score > b.score) return -1;
        if (a.score < b.score) return 1;
        return 0;
    });

    var top_influences = url_influences.slice(0, Math.min(10, url_influences.length));
    $.each(top_influences, function (i, influence) {
        influence.idx = i + 1;
    });
    $("#list_sources").html($("#sourceTemplate2").render(top_influences));
}

display_info = function (idx) {
    $("#info_" + idx).toggle();
}

new_text = function () {
    $("#text_container").show();
    $("#analysis_container").hide();
}
reset = function () {
    $("#analyzed_text").html("");
    $("#list_sources").html("");
    sentences = [];
    urls = {};
    match_sentences = [];
}

analyze_text = function () {

    $("#text_container").hide();
    $("#analysis_container").show();

    reset();

    // cut text in sentences
    var strategy=$("input:radio[name=strategy]:checked").val();
    console.log(strategy);
    $("#text").val().parseSentences(function (i, raw_string, words) {
        sentences.push(new Sentence({content:raw_string, words:words, strategy:strategy,idx:i}));
    });

// display the number of sentences
    $("#message").html(sentences.length + " sentence(s) .");

    var processed_sentences = 0.0;
    $.each(sentences, function (i, sentence) {

        //display the sentence
        $("#analyzed_text").append("<a class='sentence' id='sentence_" + i + "' style='background: #DDD;margin:5px'  href='#'  rel='popover' data-original-title='potential sources'>" + sentence.content + "</a>");


        //process the sentence= seek copies on the web
        sentence.find_copies(function (results) {

            process_result(results, sentence);
            processed_sentences++;
            $("#message").html(sentences.length + " sentences (" + Math.round((processed_sentences / sentences.length) * 100) + "% analyzed)");
            // once finished , we compute global metrics
            if (processed_sentences == sentences.length) {
                compute_global_metrics();
            }
        });
    });
}
