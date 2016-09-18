	var lantern = {
		apibaseurl: 'https://api.cottagelabs.com',
		file: undefined,
		filename: '',
		results: [],
		dois: 0,
		pmcids: 0,
		pmids: 0,
		titles: 0,
		done: false,
		poll: undefined,
		hash: undefined
	};

  lantern.review = function() {
		//console.log(results);
    //console.log(results.length);
    //console.log(dois);
    //console.log(pmcids);
    //console.log(pmids);
    //console.log(titles);
		if ( $('#review').length ) {
			var msg = '<p style="color:black;">Thank you. Your file appears to have ';
			msg += lantern.results.length;
			msg += ' record rows, containing<br>';
			if (lantern.dois > 0) msg += lantern.dois + ' DOIs<br>';
			if (lantern.pmcids > 0) msg += lantern.pmcids + ' PMC IDs<br>';
			if (lantern.pmids > 0) msg += lantern.pmids + ' PubMed IDs<br>';
			if (lantern.titles > 0) msg += lantern.titles + ' titles<br>';
			msg += 'Please submit for processing now:</p>';
			$('#review').html(msg).show();
		}
  }
  
	lantern.transform = function(split,wrap) {
		lantern.results = [];
		lantern.dois = 0;
		lantern.pmcids = 0;
		lantern.pmids = 0;
		lantern.titles = 0;
		if (split === undefined) split = ',';
		if (wrap === undefined) wrap = '"';
		var wrapreplace = new RegExp(wrap,"g");
		// could try to look for split and wrap chars in file somehow - looking at first char is no good because systems/people sometimes only use the wraps 
		// when they must, like when surrounding content with a comma, but do not bother at other times
		
    lantern.file = lantern.file.replace(/\r\n/g,'\n'); // switch MS line breaks to unix
    lantern.file = lantern.file.replace(/\n{2,}/g,'\n'); // get rid of any blank lines
    lantern.file = lantern.file.replace(/\n*$/g,''); // remove newlines at end of file
		
		var lines = [];
		var fls = lantern.file.split('\n');
		var il = '';
		for ( var f in fls ) {
			il += fls[f];
			if ( il.split(wrap).length % 2 !== 0 ) {
				lines.push(il);
				il = '';
			}
		}
		if (lines.length > 3001) {
			$('#errormsg').html('<p style="color:black;">Sorry, the maximum amount of rows you can submit in one file is 3000. Please reduce the size of your file and try again.</p>').show();
			lantern.file = undefined;
			lantern.filename = '';
		} else {
			var headers = [];
			var hline = lines.shift();
			var hlines = hline.split(split);
			var hl = '';
			for ( var h in hlines ) {
				if (hl.length > 0) hl += ',';
				hl += hlines[h];
				if ( hl.split(wrap).length % 2 !== 0 ) {
					hl = hl.replace(wrapreplace,'').replace(/(^\s*)|(\s*$)/g,''); // strip whitespace leading and ending header names
					//hl = hl.toLowerCase().replace(/ /g,'_').replace(/[^a-z0-9_]/g,'');; // could do additional header cleaning here
					headers.push(hl);
					hl = '';
				}
			}

			for (var i = 0; i < lines.length; i++) {
				var obj = {};
				var currentline = lines[i].split(split);
				var cl = '';
				var counter = 0;
				var lengths = 0;
				for ( var col in currentline ) {
					if (cl.length > 0) cl += ',';
					cl += currentline[col];
					if ( cl.split(wrap).length % 2 !== 0 ) {
						cl = cl.replace(wrapreplace,'');
						if (headers[counter] && headers[counter].length > 0) obj[headers[counter]] = cl;
						if (lengths === 0) lengths = cl.length;
						cl = '';
						counter += 1;
					}
				}
				if (obj.doi || obj.DOI) lantern.dois += 1;
				if (obj.pmcid || obj.PMCID) lantern.pmcids += 1;
				if (obj.pmid || obj.PMID) lantern.pmids += 1;
				if (obj.title || obj['Article title'] || obj['Article Title']) lantern.titles += 1;
				if (lengths) lantern.results.push(obj);
			}
			lantern.review();
		}
  }
	
  lantern.prep = function(e) {
		var f;
		if( window.FormData === undefined ) {
			f = (e.files || e.dataTransfer.files);
		} else {
			f = e.target.files[0];
		}
		lantern.filename = f.name;
		var reader = new FileReader();
		reader.onload = (function(theFile) {
			return function(e) {
				lantern.file = e.target.result;
				lantern.transform();
			};
		})(f);
		reader.readAsBinaryString(f);
  }

	lantern.error = function(data) {
		$('#lanternmulti').show();
		$('#submitting').hide();
		$('#errormsg').html('<p style="color:black;">Sorry, there has been an error with your submission. Please try again.<br>If you continue to receive an error, please contact us@cottagelabs.com attaching a copy of your file and with the following error information:<br>' + JSON.stringify(data) + '</p>').show();
  }

	lantern.polling = function(data) {
		//console.log('poll returned');
		$('.uploader').hide();
		$('#poller').show();
		var progress = !data.data || !data.data.progress ? 0 : data.data.progress;
		var pc = (Math.floor(progress * 10))/10;
		var status = '<p>Job ';
		status += data.data && data.data.name ? data.data.name : '#' + data.data._id;
		status += '</p>';
		if (data.data && data.data.new === true) status += '<p>Your job is new, and is still being loaded into the system. For large jobs this may take a couple of minutes.</p>';
		status += '<p>Your job is ' + pc + '% complete.</p>';
		status += '<p><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/results?format=csv" class="btn btn-default btn-block">Download your results</a></p>';
		status += '<p style="text-align:center;padding-top:10px;"><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/original" style="font-weight:normal;">or download your original spreadsheet</a></p>';
		if (data.data.progress !== 100) setTimeout(lantern.poll,10000);
		$('#pollinfo').html(status);
	}
	
	lantern.poll = function(hash) {
		if (hash === undefined) {
			lantern.hash = window.location.hash.replace('#','');
			hash = lantern.hash
		}
		if ( hash ) {
			$.ajax({
				url: lantern.apibaseurl + '/service/lantern/' + hash + '/progress?apikey='+clogin.apikey,
				method: 'GET',
				success: lantern.polling,
				error: lantern.error
			});		
		}
	}
		
  lantern.success = function(data) {
		$('#lanternmulti').show();
		$('#submitting').hide();
    //console.log(data);
		try {
			window.history.pushState("", "poll", '#' + data.data.job);
		} catch (err) {}
		lantern.hash = data.data.job;
		lantern.poll(data.data.job);
  }
  
	lantern.submit = function(e) {
		$('#errormsg').html("").hide();
		e.preventDefault();
		if ( !(( $('#ident').length && $('#ident').val().length ) || lantern.filename) ) {
			$('#errormsg').html('<p style="color:black;">You must provide at least an ID or a file with at least one record in order to submit. Please provide more information and try again.</p>').show();
		} else {
			$('#lanternmulti').hide();
			$('#submitting').show();
			if ( $('#ident').val() && $('#ident').val().length > 0 ) {
				var vl = $('#ident').val();
				var pl = {};
				if ( vl.indexOf('/') !== -1 ) {
					pl.doi = vl;
				} else if (vl.toLowerCase().indexOf('pmc') !== -1) {
					pl.pmcid = vl;
				} else {
					pl.pmid = vl;
				}
				lantern.results = [pl];
			}
			var payload = {list:lantern.results,name:lantern.filename};
			try { payload.email = $('#email').val(); } catch(err) {} // wellcome
			$.ajax({
				url: lantern.apibaseurl + '/service/lantern?apikey='+clogin.apikey,
				method: 'POST',
				data: JSON.stringify(payload),
				dataType: 'JSON', // TODO sort issue here, the POST invalidates preflight without jsonp but with jsonp we don't get back a jsonp object
				contentType: "application/json; charset=utf-8",
				success: lantern.success,
				error: lantern.error
			});
		}
  }
  
	lantern.startup = function() {
	  $('input[type=file]').on('change', lantern.prep);
	  $('#lanternmulti').bind('click',lantern.submit);
		$('#footer').hide();
		if (window.location.hash && window.location.hash.replace('#','').length === 17) { // our job IDs are 17 digits long
			setTimeout(function() {$('.uploader').hide();},200);
			$('#poller').show();
			$('#pollinfo').html('<p>One moment please, retrieving job status...</p>');
			lantern.hash = window.location.hash.replace('#','');
			lantern.poll(lantern.hash);
		} else {
			try {
				$.ajax({
					url: lantern.apibaseurl + '/service/lantern/jobs/' + clogin.user.email + '?apikey='+clogin.apikey,
					method: 'GET',
					success: function(data) {
						if (data.data.total) {
							var info = '<p>Your jobs:</p>';
							for ( var j in data.data.jobs ) {
								var job = data.data.jobs[j];
								info += '<a class="btn btn-default btn-block" target="_blank" href="//lantern.cottagelabs.com/#' + job._id + '">';
								info += job.name && job.name.length > 0 ? job.name : '#' + job._id;
								var date = new Date(job.createdAt).toUTCString();
								info += ' on ' + date.substring(0,date.length-7);
								info += '</a>';
							}
							$('#previousjobs').html(info);
						}
					}
				});
				$.ajax({
					url: lantern.apibaseurl + '/service/lantern/quota/' + clogin.user.email + '?apikey='+clogin.apikey,
					method: 'GET',
					success: function(data) {
						var info = '<p>You can submit up to ' + data.data.max + ' IDs in a 30 day period.</p>';
						info += '<p>You have submitted ' + data.data.count + ' IDs in the last 30 days.';
						if (data.data.allowed) {
							info += '<p>You can submit up to ' + data.data.available + ' more IDs now.</p>';
						} else {
							info += "<p>Sorry, your quota is currently exceeded - you can't submit more IDs at the moment. Please check back tomorrow.</p>";
						}
						if ( data.data.max === 100) {
							info += '<p><a class="btn btn-primary btn-block btn-lg" id="showpremium" href="#premium">Increase your quota<br>Learn more about Lantern Premium</a></p>';
						}
						info += '<p>If you wish to use the <a href="/api">API</a> to submit jobs, your API key is ' + clogin.apikey + '</p>';
						$('#quotainfo').html(info);
						$('#showpremium').bind('click',function(e) {
							$('#premium').show();
						});
					}
				});
			} catch(err) {}
		}
	}
