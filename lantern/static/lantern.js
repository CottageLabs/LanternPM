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
			$('.lanternprogress').hide();
			$('.lanternsubmit').show();
			$('#lanternmsg').html('<div class="alert alert-info"><p>Your file must have at least one record in it.<br>Please provide more information and try again.</p></div>');
		} else if ( $('#lanternreview').length ) {
			var rev = 'This report contains ' + lantern.identifiers.length + ' rows with ';
			if (lantern.dois) rev += lantern.dois + ' DOIs';
			if (lantern.dois && lantern.pmcids) rev += ', ';
			if (lantern.pmcids) rev += lantern.pmcids + ' PMC IDs<br>';
			if ((lantern.dois || lantern.pmcids) && lantern.pmids) rev += ', ';
			if (lantern.pmids) rev += lantern.pmids + ' Pubmed IDs<br>';
			if ((lantern.dois || lantern.pmcids || lantern.pmids) && lantern.titles) rev += ', ';
			if (lantern.titles) rev += lantern.titles + ' titles';
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
			$('#lanternmsg').html('<div class="alert alert-info"><p>The maximum amount of rows that can be submitted in one file is 3000. Please reduce the content of the file and try again.</p></div>');
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
					headers.push(hl.toLowerCase().replace(wrapreplace,'').replace(/[^a-z0-9_ ]/g,'').replace(/(^\s*)|(\s*$)/g,'')); // strip whitespace leading and ending header names, and messy characters
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
				if (obj.title || obj['Article title'] || obj['Article Title'] || obj['article title']) lantern.titles += 1;
				if (lengths) lantern.identifiers.push(obj);
			}
			lantern.review();
		}
  }

  lantern.upload = function(e) {
		var f;
		if( window.FormData === undefined ) {
			f = (e.files || e.dataTransfer.files);
		} else {
			f = e.target.files[0];
		}
		lantern.filename = f.name;
		if (lantern.filename.toLowerCase().indexOf('.csv') !== -1) {
			$('.lanternsubmit').hide();
			$('.lanternprogress').show();
			var msg = '<p>We\'re preparing your report for file ' + lantern.filename + '</p>';
			msg += '<p id="lanternreview"></p>';
			msg += '<p id="procbegin">Processing will begin shortly...</p>';
			if ( !$('#email').length ) $('#lanternmsg').html(msg);
			var reader = new FileReader();
			reader.onload = (function(theFile) {
				return function(e) {
					lantern.file = e.target.result;
					lantern.transform();
				};
			})(f);
			reader.readAsBinaryString(f);
		} else {
			var msg = '<div class="alert alert-info"><p>Only CSV files are accepted, with a file name ending with the ".csv" file type. There must also be at least one column titled "DOI", "PMID", "PMCID", or "Title", and containing at least one value. See our <a href="/docs#format">file upload documentation</a> for more infomration.</p></div>';
			$('#lanternmsg').html(msg);
		}
  }

	lantern.error = function(data) {
		$('.lanternprogress').hide();
		$('.lanternsubmit').show();
		$('#lanternmsg').html('<p class="alert alert-warning">There has been an error with your submission. Please try again.<br>If you continue to receive an error, please contact <a href="mailto:lantern@cottagelabs.com">lantern@cottagelabs.com</a> attaching a copy of your file');
  }

	var fieldnames;

	lantern.result = function(res,tgt) {
		if (fieldnames === undefined) {
			$.ajax({
			  url: '/static/fields.json',
			  dataType: "json",
			  success: function(data) {
			  	fieldnames = data;
			  	lantern.result(res,tgt);
			  }
			});
			return;
		}

		if (tgt === undefined) tgt = '#lanternresult';
		if (res === undefined) res = lantern.results[0];
		var info = '';
		info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1">';
		if (res.title) info += '<h4>' + res.title + '</h4>';
		info += '<div class="row"><div class="col-md-8"><p>';
		if (res.journal_title) info += 'in <i>' + res.journal_title + '</i>';
		if (res.issn) info += ' (' + res.issn + ')';
		if (!res.issn && res.eissn) info += ' (' + res.eissn + ')';
		if (res.publication_date) {
			try {
				if (res.publication_date.toLowerCase().indexOf('unavailable') !== -1) {
					info += '<br>';
					if (res.publisher) info += 'Published';
				} else {
					info += '<br>Published on ' + res.publication_date.split('T')[0].split('-').reverse().join('/');
				}
			} catch(err) {
				info += '<br>';
				if (res.publisher) info += 'Published';
			}
		}
		if (res.publisher) info += ' by ' + res.publisher;
		if (res.electronic_publication_date) {
			try {
				info += '<br>Electronically published on ' + res.publication_date.split('T')[0].split('-').reverse().join('/');
			} catch(err) {}
		}
		var ellipsing = false;
		if (res.authors) {
			info += '<br>Author(s): ';
			for ( var au in res.authors ) {
				if (res.authors[au].fullName) {
					if (au !== '0') info += ', ';
					if (au === '4') {
						ellipsing = true;
						info += '<a alt="Show more authors" title="Show more authors" href="#" id="showellipsedauthors" style="font-weight:bold;">...</a> <span id="ellipsedauthors" style="display:none;"><br>';
					}
					info += res.authors[au].fullName;
				}
			}
		}
		if (ellipsing) info += '</span>';
		info += '</p></div><div class="col-md-4"><p>';
		if (res.doi) info += 'DOI: <a href="https://doi.org/' + res.doi + '" target="_blank">' + res.doi + '</a><br>';
		if (res.pmid) info += 'Pubmed ID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/' + res.pmid + '" target="_blank">' + res.pmid + '</a><br>';
		if (res.pmcid) info += 'PMC ID: <a href="http://europepmc.org/articles/' + res.pmcid + '" target="_blank">' + res.pmcid + '</a><br>';
		info += '</p></div></div>';
		info += '</div></div>';

		var compliances = false;
		for ( var f in res ) {
			if (f.indexOf('compliance_') === 0) {
				if (compliances === false) {
					info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
					info += '<div class="row"><div class="col-sm-12"><b>Which funder mandates does this article comply with?</b></div></div>';
					compliances = true;
				}
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">';
				info += fieldnames && fieldnames[f] && fieldnames[f].long_name ? fieldnames[f].long_name : f;
				info += '</div><div class="col-sm-4" style="word-break:break-all;word-wrap:break-word;background-color:';
				info += res[f] === true ? '#B4EFA5;">Yes' : '#FF9191;">No';
				info += '</div></div>';
			}
		}
		if (compliances) info += '</div></div></div>';

		info += '<div class="row" style="margin-top:30px;"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:10px 15px 0px 15px;">';
		info += '<div class="row"><div class="col-sm-12"><b>Article details</b></div></div>';
		var keys = [
			"in_core","in_epmc","epmc_xml","aam",
			"ahead_of_print","open_access","licence",
			"pure_oa","preprint_embargo","preprint_self_archiving",
			"postprint_embargo","postprint_self_archiving","publisher_copy_embargo","publisher_copy_self_archiving"
		];
		for ( var k in keys ) {
			var key = keys[k];
			var name = fieldnames && fieldnames[key] && fieldnames[key].long_name ? fieldnames[key].long_name : key;
			var lres = res;
			if (key.indexOf('.') !== -1) {
				lres = res[key.split('.')[0]];
				key = key.split('.')[1];
			}
			if (lres[key] !== undefined && lres[key] !== null) {
				info += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">';
				info += name;
				info += '</div><div class="col-sm-4" style="background-color:';
				if (lres[key] === false) {
					info += '#FF9191;">No';
				} else if (lres[key] === true) {
					info += '#B4EFA5;">Yes';
				} else {
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
					var ft = res.repositories[rp].fulltexts[0];
					if (ft) info += '<a target="_blank" href="' + ft + '">' + ft + '</a>';
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
				info += 'PI ' + (res.grants[g].PI ? res.grants[g].PI : 'unknown');
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

		$(tgt).html(info);
		if (ellipsing) {
			$('#showellipsedauthors').bind('click',function(e) { e.preventDefault(); $('#ellipsedauthors').toggle(); });
		}
	}

	lantern.overview = function() {
		var ov = '<p>From file ' + lantern.progress.name + '</p>';
		ov += '<div class="row" style="margin-top:50px;"><div class="col-md-12">';
		ov += '<div id="overviewstats" style="margin-bottom:30px;"></div>';
		var compliance = 0;
		var licences = {};
		var identifiers = {doi:0,pmid:0,pmcid:0,title:0};
		var publishers = {};
		var in_core = 0;
		var in_base = 0;
		var in_repos = 0;
		var epmc = {xml:0,oa:0,aam:0};
		for ( var lr in lantern.results ) {
			var lrs = lantern.results[lr];
			var compliances = 0;
			var compliants = 0;
			for ( var k in lrs ) {
				if (k.indexOf('compliance_') === 0) {
					compliances += 1;
					if (lrs[k]) compliants += 1;
				}
			}
			if (compliances) compliance += compliants / compliances;
			if (lrs.licence) {
				if (licences[lrs.licence] === undefined) licences[lrs.licence] = 0;
				licences[lrs.licence] += 1;
			}
			if (lrs.doi) identifiers.doi += 1;
			if (lrs.pmid) identifiers.pmid += 1;
			if (lrs.pmcid) identifiers.pmcid += 1;
			if (lrs.title) identifiers.title += 1;
			if (lrs.publisher) {
				if (publishers[lrs.publisher] === undefined) publishers[lrs.publisher] = 0;
				publishers[lrs.publisher] += 1;
			}
			if (lrs.in_core) in_core += 1;
			if (lrs.in_base) in_base += 1;
			if (lrs.repositories !== undefined && lrs.repositories.length > 0) in_repos += 1;
			if (lrs.epmc_xml) epmc.xml += 1;
			if (lrs.open_access) epmc.oa += 1;
			if (lrs.aam) epmc.aam += 1;
			if (lrs.doi || lrs.pmid || lrs.pmcid || lrs.title) {
				ov += '<div class="well">' + (parseInt(lr)+1) + ': <a class="showresult" href="' + lr + '">';
				if (lrs.title) ov += lrs.title + ' ';
				if (lrs.doi) {
					ov += lrs.doi + ' ';
				} else if (lrs.pmcid) {
					ov += lrs.pmcid + ' ';
				} else if (lrs.pmid) {
					ov += lrs.pmid + ' ';
				}
				ov += '</a><div id="forresult' + lr + '" style="display:none;"></div></div>';
			}
		}
		compliance = (compliance / lantern.results.length) * 100;
		ov += '</div></div>';
		$('#lanternoverview').html(ov);
		var stats = '<div class="row"><div class="col-md-10 col-md-offset-1"><div class="well" style="background-color:transparent;padding:0px 15px 0px 15px;">';
		stats += '<div class="row"><div class="col-sm-8">Number of articles</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + lantern.results.length + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number of DOIs</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + identifiers.doi + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number of PMC IDs</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + identifiers.pmcid + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number of Pubmed IDs</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + identifiers.pmid + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number of titles</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + identifiers.title + '</div></div>';
		//stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Overall compliance rate</div>';
		//stats += '<div class="col-sm-4" style="text-align:center">' + compliance + '%</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number available in EuropePMC</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + epmc.xml + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number open source in EuropePMC</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + epmc.oa + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Numnber of author manuscripts in EuropePMC</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + epmc.aam + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number in CORE</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + in_core + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number in BASE</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + in_base + '</div></div>';
		stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-8">Number available in a public repository</div>';
		stats += '<div class="col-sm-4" style="text-align:center">' + in_repos + '</div></div>';
		if (JSON.stringify(licences) !== '{}') {
			stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-6">Number of articles by licence</div>';
			stats += '<div class="col-sm-6">';
			for ( var lk in licences ) stats += lk + ': ' + licences[lk] + '<br>';
			stats += '</div></div>';
		}
		if (JSON.stringify(publishers) !== '{}') {
			stats += '<div class="row" style="border-top:1px solid #ccc;"><div class="col-sm-6">Number of articles by publisher</div>';
			stats += '<div class="col-sm-6">';
			for ( var pk in publishers ) stats += pk + ': ' + publishers[pk] + '<br>';
			stats += '</div></div>';
		}
		stats += '</div></div></div><p style="margin-top:30px;">Click on any record below for further details.</p>';
		$('#overviewstats').html(stats);
		$('.showresult').bind('click',lantern.report);
	}

	lantern.report = function(e) {
		if (e) {
			e.preventDefault();
			var repno = $(this).attr('href');
			if ( $('#forresult'+repno).html().length === 0 ) lantern.result(lantern.results[repno],'#forresult'+repno);
			$('#forresult'+repno).toggle();
		} else {
			$('#lanternreport').show();
			var d = new Date(lantern.progress.createdAt);
			$('#lanterndate').html('Compiled on ' + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear());
			status += '<p><a id="downloadresults" href="#">Download results so far</a></p>';
			status += '<p><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/original' + (noddy !== undefined && noddy.apikey !== undefined ? '?apikey=' + noddy.apikey : '') + '">Or download your original spreadsheet</a></p>';
			// TODO add triggers to the share buttons
			if (lantern.results.length === 1) {
				lantern.result(lantern.results[0]);
			} else {
				lantern.overview();
				$('.reportcolumn').removeClass('col-md-10').removeClass('col-md-offset-1').addClass('col-md-12');
			}
		}
		if ($('#facebookshare').length) $('#facebookshare').attr('href',$('#facebookshare').attr('href') + encodeURIComponent(window.location.href));
		if ($('#twittershare').length) $('#twittershare').attr('href',$('#twittershare').attr('href') + encodeURIComponent(window.location.href));
		if ($('#mailshare').length) $('#mailshare').attr('href',$('#mailshare').attr('href') + encodeURIComponent(window.location.href));
	}

	lantern.rename = function(e,name) {
		if (e) e.preventDefault();
		if (name === undefined) name = $('#report_name').val();
		document.title = name;
		$('#report_rename').hide();
		$('#current_report_name').html(name);
		$('#lantern_name_header').show();
		$.ajax({
			url: lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/rename/' + name + (noddy !== undefined && noddy.apikey !== undefined ? '?apikey='+noddy.apikey : ''),
			method: 'GET'
		});
	}

	var _download_fields = {};
	lantern.polling = function(data) {
		// support the old wellcome UI for a while
		if (window.location.host.indexOf('compliance.') !== -1 || window.location.host.indexOf('wellcome.') !== -1) {
			$('.uploader').hide();
			$('#poller').show();
			var progress = !data.progress ? 0 : data.progress;
			var pc = (Math.floor(progress * 10))/10;
			var status = '<p>Job ';
			status += data.name ? data.name : '#' + data._id;
			status += '</p>';
			if (data.new === true) status += '<p>Your job is new, and is still being loaded into the system. For large jobs this may take a couple of minutes.</p>';
			status += '<p>Your job is ' + pc + '% complete.</p>';
			status += '<p><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/results?format=csv&' + (noddy !== undefined && noddy.apikey !== undefined ? 'apikey=' + noddy.apikey : '') + '" class="btn btn-default btn-block">Download your results</a></p>';
			status += '<p style="text-align:center;padding-top:10px;"><a href="' + lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/original' + (noddy !== undefined && noddy.apikey !== undefined ? '?apikey=' + noddy.apikey : '') + '" style="font-weight:normal;">or download your original spreadsheet</a></p>';
			if (data.progress !== 100) setTimeout(lantern.poll,10000);
			$('#pollinfo').html(status);
		} else {
			if (lantern.debug) console.log('poll returned');
			lantern.progress = data;
			var progress = !data.progress ? 0 : data.progress;
			var pc = (Math.floor(progress * 10))/10;
			if (data.progress !== 100) {
				document.title = pc + '% ' + (document.title.indexOf('% ') !== -1 ? document.title.split('% ')[1] : document.title);
				$('#lanternpercent').html(pc + '%');
				if ($('#lanternreview').length !== 1) {
					var pollmsg = '<p>Report ';
					if (data.name) pollmsg += 'generating from file ' + data.name + '<br>Report ';
					pollmsg += 'ID <a href="/#' + data._id + '">#' + data._id + '</a></p>';
					if (data.createdAt) {
						var d = new Date(data.createdAt);
						pollmsg += '<p>Report created on ' + d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + '</p>';
					}
					$('#lanternmsg').html(pollmsg);
				} else if ( !$('#lanternid').length ) {
					$('#procbegin').remove();
					$('#lanternmsg').append('<p id="lanternid">Report ID #' + data._id + '</p>');
				}
				var status = '';
				if (data.new === true) status += '<p>Your report is new, and is still being loaded into the system. For large reports this may take a couple of minutes.</p>';
				$('#lanternpoll').html(status);
				setTimeout(lantern.poll,10000);
			} else {
				if (document.title.indexOf('% ') !== -1) document.title = document.title.split('% ')[1];
				$('.lanternprogress').hide();
				$.ajax({
					url: lantern.apibaseurl + '/service/lantern/' + data._id + '/results'+(noddy !== undefined && noddy.apikey !== undefined ? '?apikey=' + noddy.apikey : ''),
					method: 'GET',
					success: function(data) {
						lantern.results = data;
						$('#lanternmsg').html('');
						$('#lanternpoll').html('');
						lantern.report();
					}
				});
			}
			var download = function(e) {
				var hr = lantern.apibaseurl + '/service/lantern/' + lantern.hash + '/results?format=csv&' + (noddy !== undefined && noddy.apikey !== undefined ? 'apikey=' + noddy.apikey : '');
				for ( var d in _download_fields ) hr += '&' + d + '=' + _download_fields[d];
				$(this).attr('href',hr);
			}
			$('#downloadresults').bind('click',download);
			var show_rename = function(e) {
				e.preventDefault();
				$('#lantern_name_header').hide();
				$('#report_rename').show();
			}
			if (data.report) {
				$('#current_report_name').html(data.report);
				document.title = data.report;
				$('#report_name').val(data.report);
			}
			setTimeout(function() {
				if (noddy && noddy.user && noddy.user.email === data.email) {
					$('#lantern_rename').bind('click',show_rename);
					$('#save_name').bind('click',lantern.rename);
				} else {
					$('#lantern_rename').hide();
				}
			},2000);
		}
	}

	lantern.poll = function(hash) {
		if (hash === undefined) {
			lantern.hash = window.location.hash.replace('#','');
			hash = lantern.hash
		}
		if ( hash ) {
			$.ajax({
				url: lantern.apibaseurl + '/service/lantern/' + hash + '/progress'+(noddy !== undefined && noddy.apikey !== undefined ? '?apikey=' + noddy.apikey : ''),
				method: 'GET',
				success: lantern.polling,
				error: lantern.error
			});
		}
	}

  lantern.success = function(job) {
    if (lantern.debug) console.log(job);
		try {
			window.history.pushState('#' + job._id, "", '#' + job._id);
		} catch (err) {}
		document.title = 'Lantern open access report';
		lantern.hash = job._id;
		setTimeout(function() {lantern.poll(lantern.hash); },10000);
  }

  window.addEventListener('popstate',function(e) {
  	if (lantern.debug) console.log(e.state)
  	if (e.state === null) {
			document.title = 'Lantern';
  		$('#lanternmsg').html("");
  		$('#lanternpoll').html("");
  		$('#lanternreport').hide();
  		$('.lanternprogress').hide();
  	  $('.lanternsubmit').show();
  	} else if (e.state.indexOf('#') === 0 && e.state.length === 18) {
			$('.lanternsubmit').hide();
			$('.lanternprogress').show();
			$('#lanternmsg').html('<p>One moment please, retrieving report progress...</p>');
			document.title = 'Lantern open access report';
			lantern.hash = e.state.replace('#','');
			lantern.poll(lantern.hash);
  	}
  });

	lantern.submit = function(e) {
		if (e) e.preventDefault();
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
			$('#lanternmsg').html('<div class="alert alert-info"><p>You must provide an identifier in order to submit.<br>Please provide more information and try again.</p></div>');
		} else {
			$('.lanternsubmit').hide();
			$('.lanternprogress').show();
			var payload = {list:lantern.identifiers,name:lantern.filename};
			try { payload.email = $('#email').val(); } catch(err) {} // wellcome
			$.ajax({
				url: lantern.apibaseurl + '/service/lantern'+(noddy !== undefined && noddy.apikey !== undefined ? '?apikey=' + noddy.apikey : ''),
				method: 'POST',
				data: JSON.stringify(payload),
				dataType: 'JSON',
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
			for ( var c in noddy.user.account.service.lantern.profile.fields) {
				if (noddy.user.account.service.lantern.profile.fields[c] === false) $('[name="'+c+'"]').removeAttr('checked');
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
					url: lantern.apibaseurl + '/service/lantern/fields/' + (noddy !== undefined && noddy.user !== undefined && noddy.user.email !== undefined ? noddy.user.email : '') + (noddy !== undefined && noddy.apikey !== undefined ? '?apikey='+noddy.apikey : ''),
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
			setTimeout(function() {lantern.poll(lantern.hash); },1000);
		} else {
		}
	}
