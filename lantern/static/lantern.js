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
		hash: undefined,
		debug: false
	};
	if (window.location.host.indexOf('test.cottagelabs.com') !== -1) {
		lantern.debug = true;
		lantern.apibaseurl = 'https://dev.api.cottagelabs.com';
	}

  lantern.review = function() {
		if (lantern.debug) {
			console.log(lantern.identifiers);
			console.log(lantern.identifiers.length);
			console.log(lantern.dois);
			console.log(lantern.pmcids);
			console.log(lantern.pmids);
			console.log(lantern.titles);
		}
		if ( lantern.identifiers.length === 0 ) {
			$('#lanternmsg').html('<p>Your file must have at least one record in it.<br>Please provide more information and try again.</p>');
		} else if ( $('#lanternreview').length ) {
			var rev = 'containing ' + lantern.identifiers.length + ' rows with:<br>';
			if (lantern.dois) rev += lantern.dois + ' DOIs<br>';
			if (lantern.pmcids) rev += lantern.pmcids + ' PMC IDs<br>';
			if (lantern.pmids) rev += lantern.pmids + ' Pubmed IDs<br>';
			if (lantern.titles) rev += lantern.titles + ' titles<br>';
			$('#lanternreview').html(rev);
			setTimeout(lantern.submit,3000);
		}
  }
  
	lantern.transform = function(split,wrap) {
		lantern.identifiers = [];
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
			$('#lanternmsg').html('<p>The maximum amount of rows that can be submitted in one file is 3000. Please reduce the content of the file and try again.</p>');
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
				if (lengths) lantern.identifiers.push(obj);
			}
			lantern.review();
		}
  }
	
  lantern.upload = function(e) {
		$('.lanternsubmit').hide();
		$('.lanternprogress').show();
		var f;
		if( window.FormData === undefined ) {
			f = (e.files || e.dataTransfer.files);
		} else {
			f = e.target.files[0];
		}
		lantern.filename = f.name;
		var msg = '<p>We\'re preparing your report, requested at TIME on DATE,<br> ';
		msg += 'for file ' + lantern.filename + '<br><span id="lanternreview"></span>';
		msg += '<br>Processing will begin shortly...</p>';
		$('#lanternmsg').html(msg);
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
		$('.lanternprogress').hide();
		$('.lanternsubmit').show();
		$('#lanternmsg').html('<p>There has been an error with your submission. Please try again.<br>If you continue to receive an error, please contact lantern@cottagelabs.com attaching a copy of your file');
  }
	
	lantern.result = function(res) {
		if (res === undefined) res = lantern.results[0];
		var info = '';
		info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1">';
		if (res.title) info += '<h4>' + res.title + '</h4>';
		info += '<div class="row"><div class="col-md-8"><p>';
		if (res.journal && res.journal.title) info += 'in <i>' + res.journal.title + '</i>';
		if (res.journal && res.journal.issn) info += ' (' + res.journal.issn + ')';
		if (res.journal && !res.journal.issn && res.journal.eissn) info += ' (' + res.journal.eissn + ')';
		if (res.journal && res.journal.dateOfPublication) info += '<br>Published on ' + res.journal.dateOfPublication.split('T')[0];
		if (res.publisher) info += ' by ' + res.publisher;
		if (res.electronic_published_date) info += '<br>Electronically published on ' + res.electronic_published_date;
		if (res.author) {
			info += '<br>Author(s): ALL TEH AUTHS';
			// TODO list first 5 authors, then et al? or put all in a dropdown?
		}
		info += '</p></div><div class="col-md-4"><p>';
		if (res.doi) info += 'DOI: <a href="https://doi.org/' + res.doi + '" target="_blank">' + res.doi + '</a><br>';
		if (res.pmid) info += 'Pubmed ID: <a href="/' + res.pmid + '" target="_blank">' + res.pmid + '</a><br>'; // TODO proper links for PMCID and PMID
		if (res.pmcid) info += 'PMC ID: <a href="/' + res.pmcid + '" target="_blank">' + res.pmcid + '</a><br>';
		info += '</p></div></div>';
		info += '</div></div>';
		
		if (res.compliance) {
			info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
			info += '<div class="row"><div class="col-sm-12"><b>Which funder mandates does this article comply with?</b></div></div>';
			for ( var f in res.compliance ) {
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">';
				info += f;
				info += '</div><div class="col-sm-4" style="word-break:break-all;word-wrap:break-word;background-color:';
				info += res.compliance[f].compliant === true ? '#B4EFA5;">Yes' : '#FF9191;">No';
				info += '</div></div>';
			}
			info += '</div></div></div>';
		}

		info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
		info += '<div class="row"><div class="col-sm-12"><b>Article details</b></div></div>';
		var keys = [
			'in_core','in_epmc','has_fulltext_xml','is_aam',
			'aheadofprint','is_oa','licence',
			'journal.in_doaj','embargo.preprint','archiving.preprint',
			'embargo.postprint','archiving.postprint','embargo.pdf','archiving.pdf'
		];
		var names = [
			'Is the article in CORE?','Is the fulltext available in EuropePMC?','Is the EuropePMC fulltext available as XML?','Is the EuropePMC version the accepted author manuscript (AAM)?',
			'Was the article published electronically before print?','Is the article in the EuropePMC open access subset?','What licence (if any) is the article published under?',
			'Is the article in a pure OA journal listed in DOAJ?','What is the journal preprint embargo policy?','Does the journal allow preprint self-archiving?',
			'What is the journal postprint embargo policy?','Does the journal allow postprint self-archiving?','What is the published copy embargo policy?','Does the publisher allow self-archiving of the published copy?'
		];
		for ( var k in keys ) {
			var key = keys[k];
			var name = names[k];
			var lres = res;
			if (key.indexOf('.') !== -1) {
				lres = res[key.split('.')[0]];
				key = key.split('.')[1];
			}
			if (lres[key] !== undefined && lres[key] !== null) {
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">'; // TODO add green/red shade to answers that are pro/con openness
				info += name;
				info += '</div><div class="col-sm-4" style="background-color:';
				if (lres[key] === false) {
					info += '#FF9191;">No';
				} else if (lres[key] === true) {
					info += '#B4EFA5;">Yes';
				} else {
					// TODO combine where licence found into what licence is column, perhaps
					if (key === 'licence') {
						info += lres[key].toLowerCase().indexOf('cc-') !== -1 && lres[key].toLowerCase().indexOf('-nc') === -1 ? '#B4EFA5;' : '#FF9191;';
					} else {
						info += '#ccc;';
					}
					info += '">' + lres[key];
				}
				info += '</div></div>';
			}
		}
		info += '</div></div></div>';

		if (res.repositories && res.repositories.length) {
			info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
			info += '<div class="row"><div class="col-sm-12"><b>Which repositories is this article available in?</b></div></div>';
			for ( var rp in res.repositories ) {
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-4">';
				info += res.repositories[rp].name;
				info += '</div><div class="col-sm-8" style="text-align:right;word-break:break-all;word-wrap:break-word;">';
				if (res.repositories[rp].fulltexts) {
					var ft = res.repositories[rp].fulltexts[0]; // TODO could do some guessing to pick most appropriate link
					info += '<a target="_blank" href="' + ft + '">' + ft + '</a>';
				}
				info += '</div></div>';
			}
			info += '</div></div></div>';
		}
		
		if (res.grants && res.grants.length) {
			info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
			info += '<div class="row"><div class="col-sm-12"><b>Which grants funded this research?</b></div></div>';
			for ( var g in res.grants ) {
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-4">';
				info += res.grants[g].agency;
				info += '</div><div class="col-sm-4">';
				info += 'Grant ' + res.grants[g].grantId;
				info += '</div><div class="col-sm-4">';
				info += 'PI ' + res.grants[g].PI;
				info += '</div></div>';
			}
			info += '</div></div></div>';
		}
		
		if (res.provenance && res.provenance.length) {
			info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="padding:10px 15px 0px 15px;">';
			info += '<p><b>Processing output notes</b></p><ul>';
			for ( var p in res.provenance ) {
				info += '<li>' + res.provenance[p] + '</li>';
			}
			info += '</ul></div></div></div>';
		}
		
		$('#lanternresult').html(info);
	}

	lantern.overview = function() {
		var ov = '<p>From file ' + lantern.progress.name + ' (TODO RENAME)</p>';
		ov += '<div class="row" style="margin-top:50px;">\
			<div class="col-md-12">\
				<div class="well" style="min-height:200px;">\
					<p>VIS OF JOB STATS<BR>\
					Compliance mandates headline % (for each mandate, unless user has specified one)<br>\
					Licence distribution pie chart<br>\
					How many of each type of ID did we get? bar chart<br>\
					Publisher distribution pie chart<br>\
					Date histogram(s) of print/electronic publication dates<br>\
					Headline number how many in CORE<br>\
					Headline number how many in repos<br>\
					Headline number how many fulltext in EPMC (of which xml, OA, AAM)<br>\
					</p>\
				</div>\
			</div>\
		</div>';
		$('#lanternoverview').html(ov);
	}
	
	lantern.report = function() {
		$('#lanternreport').show();
		$('#lanterndate').html('Compiled on ' + moment.unix(Math.floor(lantern.progress.createdAt/1000)).format("DD/MM/YYYY"));
		// TODO add triggers to the share buttons
		// TODO have backend work out an openness score of any given report, and give a green/red shade plus score number to each report
		if (lantern.results.length === 1) {
			lantern.result(lantern.results[0]);
		} else {
			lantern.overview();
		}
	}

	var _download_fields = {};
	lantern.polling = function(data) {
		if (lantern.debug) console.log('poll returned');
		lantern.progress = data.data;
		var progress = !data.data || !data.data.progress ? 0 : data.data.progress;
		var pc = (Math.floor(progress * 10))/10;
		if (data.data.progress !== 100) {
			$('#lanternpercent').html(pc + '%');
			if ( !$('#lanternreview').length ) {
				var pollmsg = '<p>Report ';
				if (data.data && data.data.name) pollmsg += 'generating from file ' + data.data.name + '<br>Report ';
				pollmsg += 'ID <a href="/#' + data.data._id + '">#' + data.data._id + '</a></p>';
				$('#lanternmsg').html(pollmsg);
			} else if ( !$('#lanternid').length ) {
				$('#lanternmsg').append('<p id="lanternid">Report ID #' + data.data._id + '</p>');
			}
			var status = '';
			if (data.data && data.data.new === true) status += '<p>Your report is new, and is still being loaded into the system. For large reports this may take a couple of minutes.</p>';
			status += '<p><a id="downloadresults" href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/results?format=csv&apikey=' + clogin.apikey + '">Download results so far</a></p>';
			status += '<p><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/original?apikey=' + clogin.apikey + '">Or download your original spreadsheet</a></p>';
			$('#lanternpoll').html(status);
			setTimeout(lantern.poll,10000);
		} else {
			$('.lanternprogress').hide();
			$.ajax({
				url: lantern.apibaseurl + '/service/lantern/' + data.data._id + '/results?apikey='+clogin.apikey,
				method: 'GET',
				success: function(data) {
					lantern.results = data.data;
					$('#lanternmsg').html('');
					$('#lanternpoll').html('');
					lantern.report();
				}
			});
		}
		var download = function(e) {
			var hr = $(this).attr('href') ;
			for ( var d in _download_fields ) hr += '&' + d + '=' + _download_fields[d];
			$(this).attr('href',hr);
		}
		$('#downloadresults').bind('click',download);
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
    if (lantern.debug) console.log(data);
		try {
			window.history.pushState("", "poll", '#' + data.data.job);
		} catch (err) {}
		lantern.hash = data.data.job;
		lantern.poll(data.data.job);
  }
  
	lantern.submit = function(e) {
		if (e) e.preventDefault();
		$('#lanternmsg').html("");
		if ( $('#lanternident').val() && $('#lanternident').val().length > 0 ) {
			var vl = $('#lanternident').val();
			var pl = {};
			if ( vl.indexOf('/') !== -1 ) {
				pl.doi = vl;
			} else if (vl.toLowerCase().indexOf('pmc') !== -1) {
				pl.pmcid = vl;
			} else {
				pl.pmid = vl;
			}
			lantern.identifiers = [pl];
		}
		if ( lantern.identifiers === undefined || lantern.identifiers.length === 0 ) {
			$('#lanternident').focus();
			$('#lanternmsg').html('<p>You must provide an identifier in order to submit.<br>Please provide more information and try again.</p>');
		} else {
			$('.lanternsubmit').hide();
			$('.lanternprogress').show();
			var payload = {list:lantern.identifiers,name:lantern.filename};
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
	
	lantern.fields = function() {
		var fields = ['PMCID', 'PMID', 'DOI', 'Publisher', 'Journal title', 'ISSN', 'Article title', 'Publication Date', 'Electronic Publication Date', 'Author(s)', 'In CORE?', 'Repositories', 'Repository URLs', 'Repository fulltext URLs', 'Repository OAI IDs', 'Fulltext in EPMC?', 'XML Fulltext?', 'Author Manuscript?', 'Ahead of Print?', 'Open Access?', 'Licence', 'Licence source', 'Journal Type', 'Correct Article Confidence', 'Preprint Embargo', 'Preprint Self-archiving Policy', 'Postprint Embargo', 'Postprint Self-archiving Policy', 'Publishers Copy Embargo', 'Publishers Copy Self-archiving Policy', 'Compliance Processing Output', 'Provenance', 'Grants'];
		var opts = '<p style="color:white;"><br><br>';
		opts += window.location.hash && window.location.hash.replace('#','').length === 17 ? 'Fields to include in this download:' : 'Preferred download fields:';
		for ( var f in fields ) {
			var fld = fields[f];
			opts += '<br><input class="dl_opts" type="checkbox" name="' + fld + '" checked="checked"> ' + fld;
		}
		opts += '</p>';
		$('#options').html(opts);
		try{
			for ( var c in clogin.user.account.service.lantern.profile.fields) {
				if (clogin.user.account.service.lantern.profile.fields[c] === false) $('[name="'+c+'"]').removeAttr('checked');
			}
		} catch(err) {}
		var dls = function(e) {
			var which = $(this).attr('name');
			var checked = $(this).is(':checked');
			if (window.location.hash && window.location.hash.replace('#','').length === 17) {
				_download_fields[which] = checked ? 'true' : 'false';
				if (lantern.debug) console.log(_download_fields)
			} else {
				var fld = {};
				fld[which] = checked;
				$.ajax({
					url: lantern.apibaseurl + '/service/lantern/fields/' + clogin.user.email + '?apikey='+clogin.apikey,
					method: 'POST',
					data: JSON.stringify(fld),
					dataType: 'JSON',
					contentType: "application/json; charset=utf-8"
				});
			}
		}
		$('.dl_opts').bind('change',dls);
	}
  
	lantern.startup = function() {
	  $('input[type=file]').on('change', lantern.upload);
	  $('#lanternsubmit').bind('click',lantern.submit);
		lantern.fields();
		if (window.location.hash && window.location.hash.replace('#','').length === 17) { // job IDs are 17 digits long
			$('.lanternsubmit').hide();
			$('.lanternprogress').show();
			$('#lanternmsg').html('<p>One moment please, retrieving report progress...</p>');
			lantern.hash = window.location.hash.replace('#','');
			lantern.poll(lantern.hash);
		} else {
			// TODO get user account credit info, unless user login gets this by default
		}
	}
