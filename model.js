
var Sentence = Class.extend({
        init:function (options) {
            console.log(options);
            this.content = options.content;
            this.signature = options.words;
            this.best_score = 0;
            this.copies = [];
            this.idx = options.idx;

            this.search_engine = "bing";
            this.strategy=options.strategy;
        },

        get_copy_from:function (url) {
            var right_source;
            $.each(this.copies, function (i, source) {
                if (source.url == url) {
                    right_source = source;
                }
            });
            return right_source;
        },

        sort_copies:function () {
            this.copies.sort(function (a, b) {
                if (a.score > b.score) return -1;
                if (a.score < b.score) return 1;
                return 0;
            });

            if (this.copies.length > 0) {
                this.best_score = this.copies[0].score;
            }
        },

        add_copy:function (source) {
            this.copies.push(source);
        },

        compute_similarity_with:function (content) {
            return this.compute_similarity(this.signature, content);
        },

        compute_similarity:function (ref_words, result_words) {
            var tmp;
           // if (ref_words.length < result_words.length) {
                tmp = ref_words;
                ref_words = result_words;
                result_words = tmp;
            //}*/

            var matching = 0.0;
            $.each(result_words, function (i, word) {
                if ($.inArray(word, ref_words) != -1)
                    matching++;
            });
            var score = matching / result_words.length;
            console.log([ref_words,result_words,score]);
            return (score);
        },

        find_copies:function (callback) {
            var query =this.prepare_query();
            console.log("Fetch query (" +this.strategy+"): " + query+" to "+this.search_engine);
            query = encodeURIComponent(query);
            if (this.search_engine == "bing") {
                this.find_copy_from_bing(query, callback);
            } else {
                this.find_copy_from_google(query, callback);
            }
        },

        prepare_query:function(){
            switch (this.strategy) {
                case "quote": return ("'" + this.content + "'")
                case "noquote": return (this.content)
                case "fuzzy": return this.signature.map(
                    function (a) {
                        return ("'" + a + "'");
                    }).join(" ");
            }
        },

        find_copy_from_bing:function (query, callback) {
            $.ajax({
                url:"http://api.search.live.net/json.aspx?sources=web&JsonType=callback&JsonCallback=?&Appid=57F44339DF91A8E625E6BE366FB083C55681DF51&query=" + query,
                dataType:'jsonp',
                success:function (data) {
                    var results = [];
                    if ((typeof data.SearchResponse.Web !== 'undefined') && (data.SearchResponse.Web.Total > 0)) {
                        $.each(data.SearchResponse.Web.Results, function (i, result) {
                            if (typeof result.Description !== 'undefined') {
                                results.push({
                                    url:result.Url,
                                    content:result.Description
                                });
                            }
                        });
                    }
                    callback(results);
                }
            });
        },

        find_copy_from_google:function (query, callback) {
            $.ajax({
                url:"http://ajax.googleapis.com/ajax/services/search/web?v=1.0&key=ABQIAAAAEDqSJ7sjOq1o3M9HFMUctBRHLLJL8B9uYR_4q6aVV5NleiQ1chSzfXCk5YpmwpqBSxo0Kjq3kiU-4w&q=" + query,
                dataType:'jsonp',
                success:function (data) {
                    var results = [];
                    $.each(data.responseData.results, function (i, result) {
                        results.push({
                            url:result.url,
                            content:result.content
                        });
                    });
                    callback(results);
                }
            });
        }
    })
    ;

var Url = Class.extend({

    init:function (url) {
        this.url = url;
        this.score = 0.0;   //not normalized
        this.sentences = [];
    },

    add_influence:function (sentence) {
        var source = sentence.get_copy_from(this.url);
        source.sentence_idx = sentence.idx;
        source.sentence = sentence.content;
        this.sentences.push(source);
    },

    compute_influence:function () {
        var me = this;
        $.each(this.sentences, function (i, sentence) {
            me.score += sentence.score;
        });
        console.log("influence for " + this.url + ": " + this.score);
    }
});