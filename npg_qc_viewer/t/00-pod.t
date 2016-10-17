use strict;
use warnings;
use Test::More;

local $ENV{'HOME'} = 't/data';

eval "use Test::Pod 1.14";
plan skip_all => 'Test::Pod 1.14 required' if $@;

all_pod_files_ok(all_pod_files('lib'));

1;
